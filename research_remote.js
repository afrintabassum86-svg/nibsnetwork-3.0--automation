import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function research() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        // 1. Check script_status table
        console.log('\n--- Checking script_status table ---');
        const dbScript = `
import { query } from './lib/db.js';
try {
    const r = await query("SELECT * FROM script_status WHERE id = 1");
    console.log('DB STATUS ROW:', JSON.stringify(r.rows[0], null, 2));
} catch (e) {
    console.error('DB ERROR:', e.message);
}
process.exit(0);
        `;
        // Clean the script to avoid shell escaping issues
        await ssh.execCommand('cat > diag_db_2.js << "EOF"\n' + dbScript + '\nEOF', { cwd: REMOTE_DIR });
        const dbRes = await ssh.execCommand('node diag_db_2.js', { cwd: REMOTE_DIR });
        console.log(dbRes.stdout || dbRes.stderr);

        // 2. Try to curl the local sync endpoint to see what happens
        console.log('\n--- Curling local run-script endpoint ---');
        const curlRes = await ssh.execCommand('curl -X POST -H "Content-Type: application/json" -d \'{"script": "sync-insta"}\' http://localhost:3001/api/run-script');
        console.log('Curl Result:', curlRes.stdout || curlRes.stderr);

        // 3. Check logs again after curl
        console.log('\n--- admin-server logs after curl ---');
        const logs = await ssh.execCommand('tail -n 10 /home/ubuntu/.pm2/logs/admin-server-out.log');
        console.log(logs.stdout);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

research();
