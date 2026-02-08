import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function deepHunt() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('✅ Connected\n');

        console.log('--- 1. Listeners on port 80 (Detailed) ---');
        const lsof = await ssh.execCommand('sudo lsof -i :80');
        console.log(lsof.stdout || 'Nothing on port 80');

        console.log('\n--- 2. Checking ALL Docker containers ---');
        const docker = await ssh.execCommand('sudo docker ps');
        console.log(docker.stdout || 'Docker not found or no containers');

        console.log('\n--- 3. Checking for any folder containing "dist" with "Supabase" text ---');
        const findDist = await ssh.execCommand('find / -name \"dist\" -type d 2>/dev/null');
        const dists = findDist.stdout.split('\n');
        for (const d of dists) {
            if (d.trim()) {
                const grep = await ssh.execCommand(`grep -r \"Supabase\" \"${d.trim()}\" -l | head -n 1`);
                if (grep.stdout) {
                    console.log(`FOUND OLD FILES IN: ${d.trim()}`);
                    console.log(`Sample file: ${grep.stdout}`);
                }
            }
        }

        console.log('\n--- 4. Checking Nginx access log for user IP again ---');
        const logs = await ssh.execCommand('sudo tail -n 20 /var/log/nginx/access.log');
        console.log(logs.stdout);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

deepHunt();
