import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function checkLogs() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- PM2 Status ---');
        const list = await ssh.execCommand('pm2 list');
        console.log(list.stdout);

        console.log('--- Last 50 lines of logs ---');
        const logs = await ssh.execCommand('pm2 logs admin-server --lines 50 --flush 2>&1', { cwd: '/home/ubuntu/nibsnetwork' });
        // Note: pm2 logs is an interactive command usually, better to read the log file directly
        const logFile = await ssh.execCommand('tail -n 50 ~/.pm2/logs/admin-server-out.log');
        const errFile = await ssh.execCommand('tail -n 50 ~/.pm2/logs/admin-server-error.log');

        console.log('STDOUT:');
        console.log(logFile.stdout);
        console.log('STDERR:');
        console.log(errFile.stdout);

        ssh.dispose();
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkLogs();
