import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.138.253';

async function verifyRoutes() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('\n--- 1. File Listing ---');
        const ls = await ssh.execCommand('ls -l', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(ls.stdout);

        console.log('\n--- 2. Grep Routes in admin-server.js ---');
        const routes = await ssh.execCommand('grep "app.get" admin-server.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(routes.stdout || 'No routes found');

        console.log('\n--- 3. Check for other server files ---');
        const find = await ssh.execCommand('find . -name "*server.js"', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(find.stdout);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

verifyRoutes();
