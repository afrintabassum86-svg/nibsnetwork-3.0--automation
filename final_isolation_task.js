import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function finalIsolation() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const adsPass = 'NibsNetwork2026';
        const rdsHost = 'nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com';

        const setupScript = `
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    // 1. Create DB (connect to existing nibsnetwork)
    const client1 = new Client({ connectionString: "postgresql://postgres:${adsPass}@${rdsHost}:5432/nibsnetwork" });
    await client1.connect();
    try {
        console.log('Checking for database...');
        const check = await client1.query("SELECT 1 FROM pg_database WHERE datname = 'nibsnetwork_khaikhai'");
        if (check.rowCount === 0) {
            await client1.query("CREATE DATABASE nibsnetwork_khaikhai");
            console.log('✅ Database nibsnetwork_khaikhai created.');
        } else {
            console.log('ℹ️ Database already exists.');
        }
    } catch (e) {
        console.log('Create DB Error (might be normal if already exists):', e.message);
    } finally {
        await client1.end();
    }

    // 2. Setup Tables in new DB
    const client2 = new Client({ connectionString: "postgresql://postgres:${adsPass}@${rdsHost}:5432/nibsnetwork_khaikhai" });
    await client2.connect();
    try {
        const sql = \\\`
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
\\\`;
        await client2.query(sql);
        console.log('✅ Tables created in nibsnetwork_khaikhai.');
    } catch (e) {
        console.error('Setup Tables Error:', e.message);
    } finally {
        await client2.end();
    }
}
run();
`;

        await ssh.execCommand('cat > setup_new_db.js << "EOF"\n' + setupScript + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node setup_new_db.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

        // 3. Update .env and .env in scraper
        console.log('Updating .env files...');
        const newUrl = `postgresql://postgres:${adsPass}@${rdsHost}:5432/nibsnetwork_khaikhai`;

        await ssh.execCommand(`sed -i 's|DATABASE_URL=.*|DATABASE_URL=${newUrl}|' .env`, { cwd: REMOTE_DIR });
        await ssh.execCommand(`sed -i 's|DATABASE_URL=.*|DATABASE_URL=${newUrl}|' instagram-scraper-mcp/.env`, { cwd: REMOTE_DIR });

        console.log('🔄 Restarting PM2...');
        await ssh.execCommand('pm2 restart admin-server');
        console.log('🚀 Isolation Complete.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

finalIsolation();
