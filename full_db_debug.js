import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function fullDebug() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const diagScript = `
import { query } from './lib/db.js';
try {
    console.log('--- 1. Checking table content ---');
    const rAll = await query("SELECT * FROM script_status");
    console.log('ALL ROWS:', JSON.stringify(rAll.rows, null, 2));

    if (rAll.rows.length === 0) {
        console.log('--- 2. Seeding table ---');
        await query("INSERT INTO script_status (id, status, script_name) VALUES (1, 'idle', 'none')");
        console.log('✅ INSERTED id=1');
    }

    console.log('--- 3. Verifying id=1 ---');
    const r1 = await query("SELECT * FROM script_status WHERE id = 1");
    console.log('ROW id=1:', JSON.stringify(r1.rows[0], null, 2));

} catch (e) {
    console.error('ERROR:', e.message);
}
process.exit(0);
        `;
        await ssh.execCommand('cat > full_diag.js << "EOF"\n' + diagScript + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node full_diag.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fullDebug();
