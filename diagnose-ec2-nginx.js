import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function diagnose() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Full Nginx Merged Config ---');
        const dump = await ssh.execCommand('sudo nginx -T');
        console.log(dump.stdout);

        console.log('\n--- Processes on Port 80 ---');
        const lsof = await ssh.execCommand('sudo lsof -i :80');
        console.log(lsof.stdout);

        console.log('\n--- Nginx Log Tail (Access) ---');
        const logs = await ssh.execCommand('sudo tail -n 20 /var/log/nginx/access.log');
        console.log(logs.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

diagnose();
