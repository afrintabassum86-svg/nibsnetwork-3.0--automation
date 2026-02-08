import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function findSource() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Searching for "Supabase Cloud Sync" GLOBALLY (No file type restriction) ---');
        // Search in /var/www and /home/ubuntu
        const search = await ssh.execCommand('sudo grep -ar "Supabase Cloud Sync" /var /home 2>/dev/null | head -n 5');
        console.log(search.stdout || 'NOT FOUND anywhere in /var or /home');

        console.log('\n--- Checking Nginx default_server ---');
        const defaultSrv = await ssh.execCommand('grep -r "default_server" /etc/nginx');
        console.log(defaultSrv.stdout);

        console.log('\n--- Probing localhost content ---');
        const content = await ssh.execCommand('curl -s http://localhost/admin/ | grep -o "Supabase\\|AWS"');
        console.log('Localhost response contains:', content.stdout || 'neither');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

findSource();
