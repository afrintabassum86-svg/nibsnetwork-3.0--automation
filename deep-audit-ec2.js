import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function deepAudit() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Searching for "Supabase" in all .js files ---');
        const search = await ssh.execCommand('grep -r "Supabase" /home/ubuntu /var/www -l --include="*.js" 2>/dev/null | head -n 10');
        console.log(search.stdout || 'None found.');

        console.log('\n--- Checking all Nginx Site Configs ---');
        const list = await ssh.execCommand('ls /etc/nginx/sites-enabled/');
        console.log('Enabled sites:', list.stdout);

        const configs = list.stdout.split('\n').map(f => f.trim()).filter(f => f);
        for (const conf of configs) {
            console.log(`\nConfig [${conf}]:`);
            const cat = await ssh.execCommand(`cat /etc/nginx/sites-enabled/${conf}`);
            console.log(cat.stdout);
        }

        console.log('\n--- Checking PM2 Processes ---');
        const pm2 = await ssh.execCommand('pm2 status');
        console.log(pm2.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

deepAudit();
