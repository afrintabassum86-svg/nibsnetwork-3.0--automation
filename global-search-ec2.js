import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function globalSearch() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Searching for "Live Supabase Cloud Sync" globally ---');
        // Search in /home and /var/www
        const search = await ssh.execCommand('sudo grep -r "Live Supabase Cloud Sync" /home/ubuntu /var/www 2>/dev/null | head -n 5');
        console.log(search.stdout || 'No files found with that text.');

        console.log('\n--- Checking Nginx Merged Config (Full Dump) ---');
        const dump = await ssh.execCommand('sudo nginx -T');
        fs.writeFileSync('nginx_dump_full.txt', dump.stdout);
        console.log('Full config dump saved to local nginx_dump_full.txt');

        console.log('\n--- Checking Nginx Site Available vs Enabled link ---');
        const link = await ssh.execCommand('ls -l /etc/nginx/sites-enabled/nibsnetwork');
        console.log(link.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

globalSearch();
