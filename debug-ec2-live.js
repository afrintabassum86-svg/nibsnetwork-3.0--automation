import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function debug() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- Nginx Config ---');
        const nginx = await ssh.execCommand('cat /etc/nginx/sites-enabled/nibs || cat /etc/nginx/sites-enabled/default');
        console.log(nginx.stdout);

        console.log('\n--- AdminPortal.jsx Content (Live vs AWS) ---');
        const grep1 = await ssh.execCommand('grep -E "Supabase|AWS" src/AdminPortal.jsx', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('Grep Result:', grep1.stdout);

        console.log('\n--- API_URL in src/AdminPortal.jsx ---');
        const grep2 = await ssh.execCommand('grep "API_URL =" src/AdminPortal.jsx', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('Grep Result:', grep2.stdout);

        console.log('\n--- Dist Folder Check ---');
        const ls = await ssh.execCommand('ls -la dist/index.html', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(ls.stdout);

        console.log('\n--- Check for multiple project folders ---');
        const folders = await ssh.execCommand('ls -d /home/ubuntu/*/');
        console.log(folders.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

debug();
