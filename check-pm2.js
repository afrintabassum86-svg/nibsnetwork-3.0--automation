import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

async function check() {
    console.log('Checking Processes on ' + EC2_IP);
    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    console.log('Running processes:');
    console.log((await ssh.execCommand('ps aux | grep node')).stdout);

    console.log('\nPM2 List (Ubuntu):');
    console.log((await ssh.execCommand('pm2 list')).stdout);

    console.log('\nPM2 List (Root):');
    console.log((await ssh.execCommand('sudo pm2 list')).stdout);

    ssh.dispose();
}
check();
