import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function repair() {
    console.log('🚀 Repairing Server on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('1. Forcing Git Fetch...');
        // Sometimes loose objects are corrupted. Try to clean up first.
        await ssh.execCommand('git gc --prune=now', { cwd: REMOTE_DIR });
        const fetch = await ssh.execCommand('git fetch --all', { cwd: REMOTE_DIR });
        console.log(fetch.stdout || fetch.stderr);

        console.log('2. Resetting to main...');
        const reset = await ssh.execCommand('git reset --hard origin/main', { cwd: REMOTE_DIR });
        console.log(reset.stdout || reset.stderr);

        console.log('3. Re-verifying admin-server.js...');
        const cat = await ssh.execCommand('cat admin-server.js', { cwd: REMOTE_DIR });
        console.log(cat.stdout.substring(0, 200) + '...');

        console.log('4. Restarting Server...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });

        console.log('✅ Repair complete.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        ssh.dispose();
    }
}

repair();
