import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function rebuildFrontend() {
    const ssh = new NodeSSH();
    console.log(`Connecting to NEW EC2 (${IP})...`);

    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- 1. Updating .env VITE_API_URL ---');
        // We want VITE_API_URL to point to port 80 (Nginx) which proxies to 3001
        // Or specific IP: http://43.205.228.79
        // This avoids port 3001 block issues.
        const envRes = await ssh.execCommand('cat .env', { cwd: '/home/ubuntu/nibsnetwork' });
        let envContent = envRes.stdout;

        // Update URL
        const newUrl = `http://${IP}`; // No port 3001!
        if (envContent.includes('VITE_API_URL=')) {
            envContent = envContent.replace(/VITE_API_URL=.*/g, `VITE_API_URL=${newUrl}`);
        } else {
            envContent += `\nVITE_API_URL=${newUrl}`;
        }

        await ssh.execCommand(`cat > .env << "EOF"\n${envContent}\nEOF`, { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(`✅ .env updated with VITE_API_URL=${newUrl}`);

        console.log('--- 2. Installing Dependencies (if needed) ---');
        // Required for vite build
        await ssh.execCommand('npm install', { cwd: '/home/ubuntu/nibsnetwork' });

        console.log('--- 3. Rebuilding Frontend ---');
        const buildRes = await ssh.execCommand('npm run build', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(buildRes.stdout || buildRes.stderr);

        console.log('--- 4. Restarting Admin Server ---');
        // Admin server serves the 'dist' folder
        await ssh.execCommand('pm2 restart admin-server', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('✅ Server Restarted');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

rebuildFrontend();
