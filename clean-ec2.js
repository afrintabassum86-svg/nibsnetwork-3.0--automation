import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function fixAndStore() {
    console.log('🚀 Starting EC2 Aggressive Clean to ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        // 1. Check Disk Space
        console.log('\n📊 Disk Space (Before):');
        console.log((await ssh.execCommand('df -h /')).stdout);

        // 2. Identify heavy folders
        console.log('\n🔍 Large Folders in Home:');
        console.log((await ssh.execCommand('du -sh /home/ubuntu/* | sort -rh | head -n 5')).stdout);

        // 3. Clean
        console.log('\n🧹 Cleaning...');

        // System logs
        await ssh.execCommand('sudo journalctl --vacuum-time=1d');
        await ssh.execCommand('sudo apt-get clean');
        await ssh.execCommand('sudo apt-get autoremove -y');

        // Node & PM2
        await ssh.execCommand('npm cache clean --force');
        await ssh.execCommand('pm2 flush');
        await ssh.execCommand('rm -rf ~/.npm/_cacache');

        // Delete Playwright Cache (ALL browsers) - we will reinstall only chromium later
        console.log('🗑️ Removing old Playwright browsers...');
        await ssh.execCommand('rm -rf ~/.cache/ms-playwright');

        // Delete tmp
        await ssh.execCommand('rm -rf /tmp/*');

        console.log('✅ Cleanup complete.');

        // 4. Check Disk Space Again
        console.log('\n📊 Disk Space (After):');
        console.log((await ssh.execCommand('df -h /')).stdout);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fixAndStore();
