import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function audit() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Checking /etc/nginx/sites-enabled contents ---');
        const list = await ssh.execCommand('ls -F /etc/nginx/sites-enabled/');
        console.log(list.stdout);

        const files = list.stdout.split('\n').map(f => f.trim()).filter(f => f && !f.endsWith('/'));
        for (const file of files) {
            console.log(`\n--- Content of ${file} ---`);
            const content = await ssh.execCommand(`cat /etc/nginx/sites-enabled/${file}`);
            console.log(content.stdout);
        }

        console.log('\n--- Checking for other web roots ---');
        console.log('1. /var/www/html/index.html content:');
        const varwww = await ssh.execCommand('grep -o "Supabase\\|AWS" /var/www/html/index.html || echo "File not found or no match"');
        console.log(varwww.stdout);

        console.log('\n2. /home/ubuntu/nibsnetwork/dist/index.html content:');
        const dist = await ssh.execCommand('grep -o "Supabase\\|AWS" /home/ubuntu/nibsnetwork/dist/index.html || echo "No match"');
        console.log(dist.stdout);

        console.log('\n--- Checking active Nginx processes ---');
        const ps = await ssh.execCommand('ps aux | grep nginx');
        console.log(ps.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

audit();
