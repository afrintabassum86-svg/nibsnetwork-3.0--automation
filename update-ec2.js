import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork'; // Updated path

async function fixAndStore() {
    console.log('🚀 Starting EC2 Fix & Update to ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        // 1. Check Disk Space
        console.log('\n📊 Checking Disk Space:');
        const df = await ssh.execCommand('df -h /');
        console.log(df.stdout);

        // 2. Clean Disk Space
        console.log('\n🧹 Cleaning Disk Space...');
        await ssh.execCommand('sudo apt-get clean', { cwd: REMOTE_DIR });
        await ssh.execCommand('npm cache clean --force', { cwd: REMOTE_DIR });
        await ssh.execCommand('pm2 flush', { cwd: REMOTE_DIR }); // Clear PM2 logs
        console.log('✅ Disk cleaned');

        // 3. Update Code
        console.log('\n🏃 Pulling latest code...');
        const pull = await ssh.execCommand('git pull origin main', { cwd: REMOTE_DIR });
        console.log(pull.stdout);

        // 4. Build
        console.log('\n🏗️ Building Frontend...');
        const build = await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });
        console.log(build.stdout);

        // 5. Restart
        console.log('\n🔄 Restarting Server...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });
        console.log('✅ Server restarted!');

        const status = await ssh.execCommand('pm2 status', { cwd: REMOTE_DIR });
        console.log('\nFinal PM2 Status:');
        console.log(status.stdout);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fixAndStore();
