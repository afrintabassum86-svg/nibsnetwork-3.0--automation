import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function restartFrontend() {
    const ssh = new NodeSSH();
    try {
        console.log('Connecting to EC2...');
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✓ Connected!\n');

        console.log('Checking all PM2 processes...');
        const list = await ssh.execCommand('pm2 list');
        console.log(list.stdout);

        console.log('\nRestarting all PM2 processes...');
        const restart = await ssh.execCommand('pm2 restart all');
        console.log(restart.stdout || '✓ All processes restarted');

        console.log('\nCurrent PM2 status:');
        const status = await ssh.execCommand('pm2 list');
        console.log(status.stdout);

        ssh.dispose();
        console.log('\n✓ Done!');
    } catch (e) {
        console.error('Error:', e.message);
    }
}

restartFrontend();
