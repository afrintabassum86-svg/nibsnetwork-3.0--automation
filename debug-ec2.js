// Debug Deployment
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function debug() {
    console.log('=== Debugging Deployment ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    // 1. Check Nginx Logs
    console.log('--- Nginx Error Log (Last 20 lines) ---');
    const errorLog = await ssh.execCommand('sudo tail -n 20 /var/log/nginx/error.log');
    console.log(errorLog.stdout || 'No errors');

    // 2. Check Directory Structure
    console.log('\n--- /var/www/html Content ---');
    const dir = await ssh.execCommand('ls -la /var/www/html');
    console.log(dir.stdout);

    // 3. Check assets directory
    console.log('\n--- /var/www/html/assets Content ---');
    const assets = await ssh.execCommand('ls -la /var/www/html/assets');
    console.log(assets.stdout);

    ssh.dispose();
}

debug();
