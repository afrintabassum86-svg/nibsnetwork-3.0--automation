// Check PM2 Logs
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function checkLogs() {
    console.log('=== Checking Application Logs ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    console.log('--- Admin Server Logs (Last 50 lines) ---');
    // Using pm2 logs command or reading directly from file
    const logs = await ssh.execCommand('pm2 logs admin-server --lines 50 --nostream');
    console.log(logs.stdout || logs.stderr); // PM2 outputs to stderr sometimes

    // Also check standard log files if PM2 logs fails
    console.log('\n--- ~/.pm2/logs/admin-server-error.log ---');
    const errLog = await ssh.execCommand('tail -n 50 /home/ubuntu/.pm2/logs/admin-server-error.log');
    console.log(errLog.stdout);

    console.log('\n--- ~/.pm2/logs/admin-server-out.log ---');
    const outLog = await ssh.execCommand('tail -n 50 /home/ubuntu/.pm2/logs/admin-server-out.log');
    console.log(outLog.stdout);

    ssh.dispose();
}

checkLogs();
