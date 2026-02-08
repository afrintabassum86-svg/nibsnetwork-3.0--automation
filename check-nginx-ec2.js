import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function checkNginx() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected');

        console.log('\n--- Enabled Sites ---');
        const sites = await ssh.execCommand('ls -la /etc/nginx/sites-enabled/');
        console.log(sites.stdout);

        console.log('\n--- Root Configs ---');
        const rootConfigs = await ssh.execCommand('grep -r "root" /etc/nginx/sites-enabled/');
        console.log(rootConfigs.stdout);

        console.log('\n--- Active Config Content ---');
        const activeConfig = await ssh.execCommand('cat /etc/nginx/sites-enabled/*');
        console.log(activeConfig.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

checkNginx();
