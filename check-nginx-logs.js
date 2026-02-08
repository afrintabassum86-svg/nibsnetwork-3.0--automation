import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

async function check() {
    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    console.log('Nginx Error Log:');
    console.log((await ssh.execCommand('sudo tail -n 50 /var/log/nginx/error.log')).stdout);

    console.log('\nNginx Access Log (last 20):');
    console.log((await ssh.execCommand('sudo tail -n 20 /var/log/nginx/access.log')).stdout);

    ssh.dispose();
}
check();
