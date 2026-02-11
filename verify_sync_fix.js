import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function verify() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        // 1. Trigger sync via curl
        console.log('Triggering sync via curl...');
        const curlRes = await ssh.execCommand('curl -X POST -H "Content-Type: application/json" -d \'{"script": "sync-insta"}\' http://localhost:3001/api/run-script');
        console.log('Curl Result:', curlRes.stdout || curlRes.stderr);

        // 2. Checking state
        console.log('Checking status in DB...');
        const checkScript = `
import { query } from './lib/db.js';
const r = await query("SELECT * FROM script_status WHERE id = 1");
console.log(JSON.stringify(r.rows[0], null, 2));
process.exit(0);
        `;
        await ssh.execCommand('cat > check_status.js << "EOF"\n' + checkScript + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node check_status.js', { cwd: REMOTE_DIR });
        console.log('Current DB Status:', res.stdout);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

verify();
