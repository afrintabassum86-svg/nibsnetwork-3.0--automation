import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function check() {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    console.log('Admin Server code on server:');
    console.log((await ssh.execCommand('cat admin-server.js', { cwd: REMOTE_DIR })).stdout);

    ssh.dispose();
}
check();
