import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function check() {
    console.log('Checking .env on ' + EC2_IP);
    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    const env = await ssh.execCommand('cat .env', { cwd: REMOTE_DIR });
    console.log('ENV Content (Redacted):');
    const lines = env.stdout.split('\n');
    lines.forEach(line => {
        if (line.startsWith('DATABASE_HOST=')) console.log(line);
        if (line.startsWith('DATABASE_PORT=')) console.log(line);
        if (line.startsWith('DATABASE_USER=')) console.log('DATABASE_USER=*****');
    });

    ssh.dispose();
}

check();
