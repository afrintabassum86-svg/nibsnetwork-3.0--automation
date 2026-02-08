import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function listDirs() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Home Directory Contents ---');
        const ls = await ssh.execCommand('ls -la /home/ubuntu');
        console.log(ls.stdout);

        console.log('\n--- Checking nibsnetwork folder ---');
        const ls2 = await ssh.execCommand('ls -la /home/ubuntu/nibsnetwork');
        console.log(ls2.stdout);

        console.log('\n--- Checking Nginx ERROR LOG ---');
        const logs = await ssh.execCommand('sudo tail -n 20 /var/log/nginx/error.log');
        console.log(logs.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

listDirs();
