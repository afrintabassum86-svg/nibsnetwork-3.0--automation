import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function probe() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        // 1. Create probe files in different locations
        console.log('--- Placing probe files ---');
        await ssh.execCommand('sudo bash -c "echo \"VAR_WWW_HTML\" > /var/www/html/probe.txt"');
        await ssh.execCommand('mkdir -p /home/ubuntu/nibsnetwork/dist && echo "HOME_UBUNTU_DIST" > /home/ubuntu/nibsnetwork/dist/probe.txt');

        // 2. Try to curl them via localhost
        console.log('\n--- Probing via localhost/probe.txt ---');
        const res = await ssh.execCommand('curl -s http://localhost/probe.txt');
        console.log('Response:', res.stdout || 'EMPTY/Error');

        // 3. Check Nginx Access Log while curling
        console.log('\n--- Checking Nginx access log for the probe ---');
        const lastLog = await ssh.execCommand('sudo tail -n 5 /var/log/nginx/access.log');
        console.log(lastLog.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

probe();
