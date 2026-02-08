import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function uploadDist() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        const REMOTE_DIR = '/home/ubuntu/nibsnetwork';
        const LOCAL_DIST = path.resolve(__dirname, 'dist');

        console.log('🚀 Connected. Uploading LOCAL DIST to ' + REMOTE_DIR + '/dist');

        // 1. Clean remote dist
        console.log('🧹 Cleaning remote dist folder...');
        await ssh.execCommand('rm -rf dist', { cwd: REMOTE_DIR });
        await ssh.execCommand('mkdir -p dist', { cwd: REMOTE_DIR });

        // 2. Upload directory
        console.log('📤 Uploading files (this might take a minute)...');
        await ssh.putDirectory(LOCAL_DIST, REMOTE_DIR + '/dist', {
            recursive: true,
            concurrency: 10
        });
        console.log('✅ Upload complete!');

        // 3. Verify on server
        const check = await ssh.execCommand('ls -la dist/index.html', { cwd: REMOTE_DIR });
        console.log('Server verification:', check.stdout || 'NOT FOUND');

        // 4. Update Nginx (ensure it points to dist)
        console.log('🔄 Restarting Nginx...');
        await ssh.execCommand('sudo systemctl restart nginx');

        console.log('\n✨ Deployment Successful! Now check in Incognito.');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

uploadDist();
