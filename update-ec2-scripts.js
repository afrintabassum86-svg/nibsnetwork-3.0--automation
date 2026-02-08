import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function updateScripts() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('🚀 Connected. Updating scripts on EC2...');

        const TARGET_DIR = '/var/www/nibsnetwork';
        const LOCAL_DIST = path.resolve(__dirname, 'dist');
        const LOCAL_SERVER = path.resolve(__dirname, 'admin-server.js');

        // 1. Upload new dist
        console.log('📤 Uploading updated frontend build...');
        await ssh.execCommand(`sudo rm -rf ${TARGET_DIR}/dist`);
        await ssh.execCommand(`sudo mkdir -p ${TARGET_DIR}/dist`);
        await ssh.putDirectory(LOCAL_DIST, `${TARGET_DIR}/dist`, { recursive: true });

        // 2. Upload updated admin-server.js
        console.log('📤 Uploading updated admin-server.js...');
        await ssh.putFile(LOCAL_SERVER, '/tmp/admin-server.js');
        await ssh.execCommand(`sudo mv /tmp/admin-server.js ${TARGET_DIR}/admin-server.js`);

        // 3. Ensure permissions
        console.log('🔐 Setting permissions...');
        await ssh.execCommand(`sudo chown -R ubuntu:www-data ${TARGET_DIR}`);

        // 4. Restart PM2 (it should be running from /var/www/nibsnetwork or /home/ubuntu)
        console.log('🔄 Restarting processes...');

        // Let's check where PM2 is running from
        const pm2Status = await ssh.execCommand('pm2 status admin-server');
        console.log(pm2Status.stdout);

        // Restart
        await ssh.execCommand('pm2 restart admin-server');

        console.log('\n✅ Update Complete! Please refresh the admin portal.');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

updateScripts();
