import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

// OLD EC2
const IP_OLD = '43.205.138.253';
const DB_NAME_OLD = 'nibsnetwork_hayret';

// NEW EC2
const IP_NEW = '43.205.228.79';
const DB_NAME_NEW = 'nibsnetwork_khaikhai';

async function fixEnv(ip, newDbName, label) {
    const ssh = new NodeSSH();
    console.log(`\n--- Fixing ${label} (${ip}) ---`);
    try {
        await ssh.connect({
            host: ip,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log(`Setting DATABASE_NAME=${newDbName}`);

        // Read .env
        const envRes = await ssh.execCommand('cat .env', { cwd: '/home/ubuntu/nibsnetwork' });
        let envContent = envRes.stdout;

        // Regex replace DATABASE_NAME
        if (envContent.includes('DATABASE_NAME=')) {
            envContent = envContent.replace(/DATABASE_NAME=.*/g, `DATABASE_NAME=${newDbName}`);
        } else {
            envContent += `\nDATABASE_NAME=${newDbName}`;
        }

        // Write back
        await ssh.execCommand(`cat > .env << "EOF"\n${envContent}\nEOF`, { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('✅ .env updated');

        // Restart (ensure update-env)
        await ssh.execCommand('pm2 restart admin-server --update-env', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('✅ PM2 Restarted');

        // Create DB for NEW EC2 (if not exists) - treating Khaikhai as separate DB strategy now
        if (label.includes('New')) {
            console.log('Ensure DB exists...');
            const rdsHost = 'nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com'; // Hardcoded from known value
            const createDbCmd = `export PGPASSWORD='NibsNetwork2026'; psql -h ${rdsHost} -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${newDbName}'" | grep -q 1 || psql -h ${rdsHost} -U postgres -d postgres -c "CREATE DATABASE ${newDbName}"`;
            await ssh.execCommand(createDbCmd);
            console.log('✅ DB Existence Checked/Created');

            // Also need to create tables in new DB!
            // Reuse the schema creation logic?
            // Or just let the user sync?
            // Admin Portal usually creates tables? No, schema.sql usually run manually.
            // I should run schema setup for new DB.
            const schemaSql = `
CREATE TABLE IF NOT EXISTS instagram_posts (id TEXT PRIMARY KEY, title TEXT, url TEXT, image TEXT, type TEXT, blog_url TEXT, timestamp TIMESTAMPTZ, manual_edit BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS blog_articles (id SERIAL PRIMARY KEY, title TEXT, url TEXT UNIQUE, category TEXT, slug TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS script_status (id SERIAL PRIMARY KEY, status TEXT DEFAULT 'idle', script_name TEXT, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, output TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO script_status (id, status, script_name) VALUES (1, 'idle', 'none') ON CONFLICT (id) DO NOTHING;
             `;
            await ssh.execCommand(`export PGPASSWORD='NibsNetwork2026'; psql -h ${rdsHost} -U postgres -d ${newDbName} << 'EOF2'\n${schemaSql}\nEOF2`);
            console.log('✅ Tables created in new DB');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

async function run() {
    await fixEnv(IP_OLD, DB_NAME_OLD, 'Old EC2 (Hayret)');
    await fixEnv(IP_NEW, DB_NAME_NEW, 'New EC2 (Khaikhai)');
}

run();
