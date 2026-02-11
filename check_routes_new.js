import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function checkRoutes() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- Reading admin-server.js ---');
        const res = await ssh.execCommand('cat admin-server.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(res.stdout);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

checkRoutes();
