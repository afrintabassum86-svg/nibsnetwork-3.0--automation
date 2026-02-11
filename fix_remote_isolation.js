import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function fixTables() {
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
    const client = new Client({ connectionString: "postgresql://postgres:${adsPass}@${rdsHost}:5432/nibsnetwork_khaikhai" });
    await client.connect();
    try {
        await client.query("CREATE TABLE IF NOT EXISTS instagram_posts (id TEXT PRIMARY KEY, title TEXT, url TEXT, image TEXT, type TEXT, blog_url TEXT, timestamp TIMESTAMPTZ, manual_edit BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW())");
        await client.query("CREATE TABLE IF NOT EXISTS blog_articles (id SERIAL PRIMARY KEY, title TEXT, url TEXT UNIQUE, category TEXT, slug TEXT, created_at TIMESTAMPTZ DEFAULT NOW())");
        await client.query("CREATE TABLE IF NOT EXISTS script_status (id SERIAL PRIMARY KEY, status TEXT DEFAULT 'idle', script_name TEXT, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, output TEXT, updated_at TIMESTAMPTZ DEFAULT NOW())");
        await client.query("INSERT INTO script_status (id, status, script_name) VALUES (1, 'idle', 'none') ON CONFLICT (id) DO NOTHING");
        console.log('✅ Tables verified/created in nibsnetwork_khaikhai.');
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await client.end();
    }
}
run();
`;
        await ssh.execCommand('cat > fix_tables.js << "EOF"\n' + setupScript + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node fix_tables.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

        // Repopulate data since it's a fresh DB
        console.log('\n--- Repopulating Isolated DB ---');
        await ssh.execCommand('node instagram-scraper-mcp/fetch_api.js', { cwd: REMOTE_DIR });
        await ssh.execCommand('node instagram-scraper-mcp/crawl_blog.js', { cwd: REMOTE_DIR });

        console.log('✅ Repopulation Complete.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fixTables();
