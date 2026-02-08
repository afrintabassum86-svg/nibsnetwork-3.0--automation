import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function start() {
    console.log('🚀 Starting Admin Server on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('Stopping old instance if any...');
        await ssh.execCommand('pm2 delete admin-server', { cwd: REMOTE_DIR });

        console.log('Starting new instance...');
        const res = await ssh.execCommand('pm2 start admin-server.js --name "admin-server"', { cwd: REMOTE_DIR });
        console.log(res.stdout);
        console.log(res.stderr);

        console.log('Saving config...');
        await ssh.execCommand('pm2 save', { cwd: REMOTE_DIR });

        console.log('✅ Server started.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        ssh.dispose();
    }
}

start();
