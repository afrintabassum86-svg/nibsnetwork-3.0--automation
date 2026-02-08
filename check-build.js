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

    console.log('Dist folder content:');
    console.log((await ssh.execCommand('ls -R dist', { cwd: REMOTE_DIR })).stdout);

    console.log('\nIndex.html content:');
    console.log((await ssh.execCommand('cat dist/index.html', { cwd: REMOTE_DIR })).stdout);

    ssh.dispose();
}
check();
