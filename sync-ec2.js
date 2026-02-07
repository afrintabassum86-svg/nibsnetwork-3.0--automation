// Sync EC2 server with latest data
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function syncEC2() {
    console.log('=== Syncing EC2 Server ===\n');

    const ssh = new NodeSSH();

    try {
        console.log('Connecting to EC2...');
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✓ Connected!\n');

        // Pull latest code
        console.log('Pulling latest code from GitHub...');
        const pullResult = await ssh.execCommand('git pull origin main', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(pullResult.stdout || 'Already up to date');

        // Update .env file
        console.log('\nUpdating .env file...');
        const envContent = fs.readFileSync('.env', 'utf8');
        await ssh.execCommand(`cat > /home/ubuntu/nibsnetwork/.env << 'ENVEOF'
${envContent}
ENVEOF`);
        console.log('✓ .env updated');

        // Restart server
        console.log('\nRestarting PM2...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('✓ Server restarted');

        // Check status
        const statusResult = await ssh.execCommand('pm2 list');
        console.log('\nPM2 Status:');
        console.log(statusResult.stdout);

        console.log('\n✓ EC2 Sync Complete!');
        ssh.dispose();

    } catch (error) {
        console.error('Error:', error.message);
        ssh.dispose();
    }
}

syncEC2();
