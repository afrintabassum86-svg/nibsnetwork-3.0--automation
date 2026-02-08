import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function extremeHunt() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        // 1. Verify IP
        const ip = await ssh.execCommand('curl -s https://ifconfig.me');
        console.log('EC2 Public IP:', ip.stdout);

        // 2. Search for the text everywhere
        console.log('\n--- Exhaustive search for "Supabase Cloud Sync" ---');
        // This might be slow but we need it.
        const search = await ssh.execCommand('sudo grep -r "Supabase Cloud Sync" / --exclude-dir=node_modules --exclude-dir=proc --exclude-dir=sys --exclude-dir=dev 2>/dev/null | head -n 10');
        console.log('Search Results:', search.stdout || 'NONE FOUND');

        // 3. Check for other web servers
        console.log('\n--- Port 80 Listeners ---');
        const netstat = await ssh.execCommand('sudo netstat -tulpn | grep :80');
        console.log(netstat.stdout);

        // 4. Check for other project directories
        console.log('\n--- Checking for other project-like folders ---');
        const findDirs = await ssh.execCommand('find /home /var -maxdepth 2 -type d');
        console.log(findDirs.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

extremeHunt();
