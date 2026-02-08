import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function deploy() {
    console.log('🚀 Emergency Clean & Deploy to ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        // 1. Backup .env
        console.log('💾 Backing up .env files...');
        await ssh.execCommand('cp .env ../env.backup', { cwd: REMOTE_DIR });
        // Handle potential failure if .env doesn't exist

        // 2. Free up space (actions runner work dir)
        console.log('🗑️ Deleting Actions Runner Work Dir...');
        await ssh.execCommand('rm -rf /home/ubuntu/actions-runner/_work');

        // 3. Remove node_modules to ensure clean state
        console.log('🗑️ Removing node_modules...');
        await ssh.execCommand('rm -rf node_modules', { cwd: REMOTE_DIR });

        // 4. Git Pull (Force)
        console.log('⬇️ Pulling latest code...');
        await ssh.execCommand('git fetch --all', { cwd: REMOTE_DIR });
        await ssh.execCommand('git reset --hard origin/main', { cwd: REMOTE_DIR });

        // 5. Restore .env
        console.log('📂 Restoring .env...');
        await ssh.execCommand('cp ../env.backup .env', { cwd: REMOTE_DIR });

        // 6. NPM Install
        console.log('📦 Installing Dependencies...');
        const install = await ssh.execCommand('npm install --no-audit', { cwd: REMOTE_DIR });
        console.log(install.stdout);
        console.log(install.stderr);

        // 7. Playwright Install
        console.log('🎭 Installing Playwright Chromium...');
        const pw = await ssh.execCommand('npx playwright install chromium', { cwd: REMOTE_DIR });
        console.log(pw.stdout);
        console.log(pw.stderr);

        // 8. Build
        console.log('🏗️ Building...');
        const build = await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });
        console.log(build.stdout); // Log build output

        // 9. Restart PM2
        console.log('🔄 Restarting Server...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });

        console.log('✅ Done!');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        ssh.dispose();
    }
}

deploy();
