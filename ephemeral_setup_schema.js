import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function setupSchema() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const setupSql = `
CREATE SCHEMA IF NOT EXISTS khaikhai;

-- Create tables in the new schema
CREATE TABLE IF NOT EXISTS khaikhai.instagram_posts (
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

CREATE TABLE IF NOT EXISTS khaikhai.blog_articles (
    id SERIAL PRIMARY KEY,
    title TEXT,
    url TEXT UNIQUE,
    category TEXT,
    slug TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS khaikhai.script_status (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'idle',
    script_name TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    output TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed script_status
INSERT INTO khaikhai.script_status (id, status, script_name) 
VALUES (1, 'idle', 'none')
ON CONFLICT (id) DO NOTHING;
`;

        const helperScript = `
import { query } from './lib/db.js';
const sql = \`${setupSql}\`;
try {
    await query(sql);
    console.log('✅ Schema and tables created safely.');
} catch (e) {
    console.error('❌ SQL Error:', e.message);
}
process.exit(0);
        `;

        await ssh.execCommand('cat > setup_schema_remote.js << "EOF"\n' + helperScript + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node setup_schema_remote.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

        // cleanup
        await ssh.execCommand('rm setup_schema_remote.js', { cwd: REMOTE_DIR });

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

setupSchema();
