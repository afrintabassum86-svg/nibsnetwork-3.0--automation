import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();
const EC2_IP = '43.205.138.253';
const KEY_PATH = './nibsnetwork-key.pem';

async function deploy() {
    console.log('🚀 Connecting to EC2...');

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(KEY_PATH, 'utf8')
        });
        console.log('✓ Connected');

        console.log('📤 Uploading files...');

        // Upload admin-server.js (Already done by deploy-ec2.js)
        // await ssh.putFile('./admin-server.js', '/home/ubuntu/nibsnetwork/admin-server.js');
        // console.log('✓ admin-server.js uploaded');

        // Upload setup-runner.sh
        await ssh.putFile('./setup-runner.sh', '/home/ubuntu/nibsnetwork/setup-runner.sh');
        await ssh.execCommand('chmod +x /home/ubuntu/nibsnetwork/setup-runner.sh');
        console.log('✓ setup-runner.sh uploaded');

        console.log('⚙️  Running setup script (this may take a minute)...');
        const setupResult = await ssh.execCommand('bash setup-runner.sh', {
            cwd: '/home/ubuntu/nibsnetwork',
            stream: 'stdout' // Stream output to console
        });

        if (setupResult.code !== 0) {
            console.error('⚠️ Setup script finished with warnings/errors:', setupResult.stderr);
        } else {
            console.log('✓ Setup script completed');
        }

        console.log('🔄 Restarting Admin Server...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: '/home/ubuntu/nibsnetwork' });
        await ssh.execCommand('pm2 save', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('✓ Server restarted');

        console.log('\n✅ Deployment Complete!');
        console.log('---------------------------------------------------');
        console.log('IMPORTANT: You must now SSH into the server and run:');
        console.log('cd ~/actions-runner');
        console.log('./config.sh --url https://github.com/afrintabassum86-svg/nibsnetwork-3.0--automation --token <YOUR_TOKEN>');
        console.log('./run.sh');
        console.log('---------------------------------------------------');

        ssh.dispose();

    } catch (error) {
        console.error('❌ Deployment Failed:', error);
        process.exit(1);
    }
}

deploy();
