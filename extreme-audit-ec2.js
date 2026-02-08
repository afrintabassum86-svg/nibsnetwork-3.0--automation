import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function extremeAudit() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Last Modified Dates in dist/ ---');
        const dates = await ssh.execCommand('ls -lt /home/ubuntu/nibsnetwork/dist | head -n 10');
        console.log(dates.stdout);

        console.log('\n--- Checking ALL Nginx config locations ---');
        const ls1 = await ssh.execCommand('ls -l /etc/nginx/sites-enabled/');
        console.log('sites-enabled:', ls1.stdout);

        const ls2 = await ssh.execCommand('ls -l /etc/nginx/conf.d/');
        console.log('conf.d:', ls2.stdout);

        console.log('\n--- Checking for "default_server" directive globally in /etc/nginx ---');
        const grep = await ssh.execCommand('grep -r "default_server" /etc/nginx');
        console.log(grep.stdout);

        console.log('\n--- Probing /admin/ with full headers ---');
        const curl = await ssh.execCommand('curl -v http://localhost/admin/ 2>&1 | head -n 30');
        console.log(curl.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

extremeAudit();
