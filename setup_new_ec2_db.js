import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function setupNewEc2DB() {
    const ssh = new NodeSSH();
    console.log(`Checking connection to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- 1. Installing PostgreSQL Client ---');
        await ssh.execCommand('sudo apt-get update && sudo apt-get install -y postgresql-client');

        console.log('--- 2. Creating Database: nibsnetwork_khaikhai ---');
        const dbName = 'nibsnetwork_khaikhai';
        const rdsHost = 'nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com';

        // Create DB 
        const createCmd = `export PGPASSWORD='NibsNetwork2026'; psql -h ${rdsHost} -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '${dbName}'" | grep -q 1 || psql -h ${rdsHost} -U postgres -d postgres -c "CREATE DATABASE ${dbName}"`;
        const createRes = await ssh.execCommand(createCmd);
        console.log(createRes.stdout || createRes.stderr);

        console.log('--- 3. Running Schema Setup ---');
        const schemaSql = `
CREATE TABLE IF NOT EXISTS instagram_posts (id TEXT PRIMARY KEY, title TEXT, url TEXT, image TEXT, type TEXT, blog_url TEXT, timestamp TIMESTAMPTZ, manual_edit BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS blog_articles (id SERIAL PRIMARY KEY, title TEXT, url TEXT UNIQUE, category TEXT, slug TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS script_status (id SERIAL PRIMARY KEY, status TEXT DEFAULT 'idle', script_name TEXT, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, output TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO script_status (id, status, script_name) VALUES (1, 'idle', 'none') ON CONFLICT (id) DO NOTHING;
        `;
        // Escape specific chars if needed, but heredoc usually safe. Let's use file upload to be safer.
        await ssh.execCommand(`cat > schema_setup.sql << "EOF"\n${schemaSql}\nEOF`, { cwd: '/home/ubuntu/nibsnetwork' });

        const schemaCmd = `export PGPASSWORD='NibsNetwork2026'; psql -h ${rdsHost} -U postgres -d ${dbName} -f schema_setup.sql`;
        const schemaRes = await ssh.execCommand(schemaCmd, { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(schemaRes.stdout || schemaRes.stderr);

        console.log('--- 4. Restarting Admin Server ---');
        await ssh.execCommand('pm2 restart admin-server --update-env', { cwd: '/home/ubuntu/nibsnetwork' });

        console.log('--- 5. Re-fetching Data ---');
        const fetchRes = await ssh.execCommand('node instagram-scraper-mcp/fetch_api.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(fetchRes.stdout || fetchRes.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

setupNewEc2DB();
