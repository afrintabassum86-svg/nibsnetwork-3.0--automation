import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

async function prep() {
    console.log('🚀 Preparing Space on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('Removing actions-runner workspace...');
        await ssh.execCommand('rm -rf /home/ubuntu/actions-runner/_work');

        console.log('Removing node_modules...');
        await ssh.execCommand('rm -rf /home/ubuntu/nibsnetwork/node_modules');

        console.log('Removing any npm cache...');
        await ssh.execCommand('npm cache clean --force');
        await ssh.execCommand('rm -rf ~/.npm/_cacache');

        console.log('Space Check:');
        console.log((await ssh.execCommand('df -h /')).stdout);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        ssh.dispose();
    }
}

prep();
