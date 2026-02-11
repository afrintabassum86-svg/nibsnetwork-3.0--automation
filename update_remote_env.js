import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79'; // NEW EC2 IP (Automation 4.0)
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function uploadNewEnv() {
    console.log('🚀 Connecting to NEW EC2 (4.0): ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        if (!fs.existsSync(SSH_KEY_PATH)) {
            throw new Error(`SSH Key not found at ${SSH_KEY_PATH}`);
        }

        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to new EC2!');

        // 1. Upload root .env
        console.log('📤 Uploading root .env...');
        await ssh.putFile('.env', path.join(REMOTE_DIR, '.env'));

        // 2. Upload scraper .env
        console.log('📤 Uploading instagram-scraper-mcp/.env...');
        try {
            await ssh.putFile('instagram-scraper-mcp/.env', path.join(REMOTE_DIR, 'instagram-scraper-mcp/.env'));
        } catch (e) {
            console.warn('⚠️ Manual scraper .env upload failed (skipping if path differs remotely)');
        }

        console.log('✅ .env files uploaded to EC2.');

        // 3. Restart PM2 Server
        console.log('🔄 Restarting PM2 admin-server...');
        const restart = await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });

        if (restart.stdout.includes('online')) {
            console.log('✅ Server restarted and online!');
        } else {
            console.log('ℹ️ Restart output:', restart.stdout || restart.stderr);
        }

        // 4. Verify IP in .env remotely
        console.log('\n🔍 Verifying Instagram ID in remote .env:');
        const check = await ssh.execCommand('grep "INSTAGRAM_BUSINESS_ACCOUNT_ID" .env', { cwd: REMOTE_DIR });
        console.log(check.stdout);

    } catch (err) {
        console.error('❌ SSH Error:', err.message);
    } finally {
        ssh.dispose();
        process.exit();
    }
}

uploadNewEnv();
