import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function fixAndStore() {
    console.log('🚀 Starting EC2 Fix (Force Pull) & Update to ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        // 1. Force Pull latest code
        console.log('\n🏃 Force Pulling latest code...');
        let pull = await ssh.execCommand('git fetch --all', { cwd: REMOTE_DIR });
        console.log(pull.stdout); console.log(pull.stderr);

        pull = await ssh.execCommand('git reset --hard origin/main', { cwd: REMOTE_DIR });
        console.log("Reset Output:", pull.stdout); console.log(pull.stderr);

        // 2. Install dependencies
        console.log('\n📦 Installing dependencies...');
        // We use --omit=dev if not needed, but we need playwright which might be viewed as dev dep if user put it there?
        // Wait, package.json has "dependencies": { ... "playwright": ... } now? (I added it).
        // If I use npm ci it might be safer but stricter. npm install is safer for disk space usually as it reuses existing node_modules.
        const install = await ssh.execCommand('npm install --no-audit', { cwd: REMOTE_DIR });
        console.log(install.stdout);
        console.log(install.stderr);

        // 3. Install Playwright Browsers
        console.log('\n🎭 Installing Playwright Browsers (Chromium)...');
        // This might fail if disk space is low. 
        const pwInstall = await ssh.execCommand('npx playwright install chromium', { cwd: REMOTE_DIR });
        console.log(pwInstall.stdout);
        console.log(pwInstall.stderr);

        if (pwInstall.code !== 0) {
            console.log('Trying to free up more space by removing older browsers not needed...');
            await ssh.execCommand('rm -rf ~/.cache/ms-playwright/firefox*', { cwd: REMOTE_DIR });
            await ssh.execCommand('rm -rf ~/.cache/ms-playwright/webkit*', { cwd: REMOTE_DIR });

            // Retry
            console.log('Retrying playwright install...');
            await ssh.execCommand('npx playwright install chromium', { cwd: REMOTE_DIR });
        }

        // 4. Install OS dependencies for Playwright
        console.log('\n🐧 Installing Playwright OS Dependencies...');
        const pwDeps = await ssh.execCommand('sudo npx playwright install-deps chromium', { cwd: REMOTE_DIR });
        console.log(pwDeps.stdout);
        console.log(pwDeps.stderr);

        // 5. Build Frontend
        console.log('\n🏗️ Building Frontend...');
        const build = await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });
        console.log(build.stdout);

        // 6. Restart Server
        console.log('\n🔄 Restarting Server...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });
        console.log('✅ Server restarted!');

        // 7. Verify disk space again
        console.log('\n📊 Final Disk Space:');
        console.log((await ssh.execCommand('df -h /')).stdout);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fixAndStore();
