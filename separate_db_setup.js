import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function createSeparateDB() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        // 1. Create the database
        // We use a different connection script since we can't create a DB while connected to it
        // and we need to avoid transactions.
        const createDbScript = `
import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: "${process.env.DATABASE_URL || 'postgresql://postgres:NibsNetwork2026@nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com:5432/nibsnetwork'}" });
await client.connect();
try {
    // Check if it exists
    const check = await client.query("SELECT 1 FROM pg_database WHERE datname = 'nibsnetwork_khaikhai'");
    if (check.rowCount === 0) {
        await client.query("CREATE DATABASE nibsnetwork_khaikhai");
        console.log('✅ Database nibsnetwork_khaikhai created.');
    } else {
        console.log('ℹ️ Database nibsnetwork_khaikhai already exists.');
    }
} catch (e) {
    console.error('Error creating DB:', e.message);
} finally {
    await client.end();
}
process.exit(0);
        `;

        // Note: I'll manually replace the connection string in the template if needed, 
        // but I'll use a safer way: read the .env and extract the base URL.
        const getBaseUrlScript = `
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=(postgresql:\\/\\/.*:.*@.*:\\d+\\/)nibsnetwork/);
if (match) {
    console.log(match[1] + 'postgres'); // Connect to default postgres DB to create the new one
}
        `;
        await ssh.execCommand('node -e "' + getBaseUrlScript.replace(/\n/g, ' ') + '"', { cwd: REMOTE_DIR });
        // Instead of complex logic, I'll just hardcode the known RDS host for this one task.
        const rdsHost = 'nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com';
        const rdsPass = 'NibsNetwork2026';

        const finalCreateScript = `
import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: "postgresql://postgres:${rdsPass}@${rdsHost}:5432/postgres" });
await client.connect();
try {
    const check = await client.query("SELECT 1 FROM pg_database WHERE datname = 'nibsnetwork_khaikhai'");
    if (check.rowCount === 0) {
        await client.query("CREATE DATABASE nibsnetwork_khaikhai");
        console.log('✅ Database nibsnetwork_khaikhai created.');
    } else {
        console.log('ℹ️ Database nibsnetwork_khaikhai already exists.');
    }
} catch (e) {
    console.error('Error:', e.message);
} finally {
    await client.end();
}
process.exit(0);
        `;

        await ssh.execCommand('cat > create_db.js << "EOF"\n' + finalCreateScript + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node create_db.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

        // 2. Setup Tables in the new DB
        const setupTablesScript = `
import pkg from 'pg';
const { Client } = pkg;
const client = new Client({ connectionString: "postgresql://postgres:${rdsPass}@${rdsHost}:5432/nibsnetwork_khaikhai" });
await client.connect();
const sql = \`
CREATE TABLE IF NOT EXISTS instagram_posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT,
    image TEXT,
    type TEXT,
    blog_url TEXT,
    timestamp TIMESTAMPTZ,
    manual_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_articles (
    id SERIAL PRIMARY KEY,
    title TEXT,
    url TEXT UNIQUE,
    category TEXT,
    slug TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS script_status (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'idle',
    script_name TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    output TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO script_status (id, status, script_name) VALUES (1, 'idle', 'none') ON CONFLICT (id) DO NOTHING;
\`;
try {
    await client.query(sql);
    console.log('✅ Tables created in nibsnetwork_khaikhai.');
} catch (e) {
    console.error('Error:', e.message);
} finally {
    await client.end();
}
process.exit(0);
        `;
        await ssh.execCommand('cat > setup_tables.js << "EOF"\n' + setupTablesScript + '\nEOF', { cwd: REMOTE_DIR });
        const res2 = await ssh.execCommand('node setup_tables.js', { cwd: REMOTE_DIR });
        console.log(res2.stdout || res2.stderr);

        // 3. Update .env to use the new DB
        console.log('Updating .env to point to nibsnetwork_khaikhai...');
        await ssh.execCommand("sed -i 's/nibsnetwork\\?options/-csearch_path%3Dkhaikhai/nibsnetwork_khaikhai/g' .env", { cwd: REMOTE_DIR });
        await ssh.execCommand("sed -i 's/nibsnetwork$/nibsnetwork_khaikhai/g' .env", { cwd: REMOTE_DIR });
        // Also cleanup my previous failed attempt at search_path
        await ssh.execCommand("sed -i 's/nibsnetwork_khaikhai\\\\?options.*/nibsnetwork_khaikhai/g' .env", { cwd: REMOTE_DIR });

        // Sync scraper .env too
        await ssh.execCommand("cat .env > instagram-scraper-mcp/.env", { cwd: REMOTE_DIR });

        console.log('🔄 Restarting PM2...');
        await ssh.execCommand('pm2 restart admin-server');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

createSeparateDB();
