// Rebuild Frontend carefully
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function rebuild() {
    console.log('=== Rebuilding Frontend ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    // 1. Force .env file content
    console.log('Updating .env file...');
    await ssh.execCommand(`echo 'VITE_API_URL=http://${EC2_IP}:3001' > /home/ubuntu/nibsnetwork/.env`);

    // 2. Install dependencies again (just in case)
    console.log('Installing dependencies...');
    await ssh.execCommand('npm install', { cwd: '/home/ubuntu/nibsnetwork' });

    // 3. Build
    console.log('Building...');
    // We explicitly pass the env var to the build command to be 100% sure
    const build = await ssh.execCommand('VITE_API_URL=http://43.205.138.253:3001 npm run build', { cwd: '/home/ubuntu/nibsnetwork' });
    console.log(build.stdout);
    if (build.stderr) console.log('Stderr:', build.stderr);

    // 4. Deploy
    console.log('Copying to Nginx...');
    await ssh.execCommand('sudo cp -r /home/ubuntu/nibsnetwork/dist/* /var/www/html/');

    console.log('\n✓ Rebuild Complete!');
    ssh.dispose();
}

rebuild();
