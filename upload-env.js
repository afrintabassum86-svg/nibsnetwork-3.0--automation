import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function uploadEnv() {
    console.log('🚀 Uploading local .env to ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('Uploading .env...');
        await ssh.putFile('.env', path.join(REMOTE_DIR, '.env'));

        console.log('Uploading instagram-scraper-mcp/.env...');
        try {
            await ssh.putFile('instagram-scraper-mcp/.env', path.join(REMOTE_DIR, 'instagram-scraper-mcp/.env'));
        } catch (e) {
            console.warn('⚠️ Could not upload instagram-scraper-mcp/.env (maybe not local?)');
            // If local doesn't exist, maybe check if root .env covers it?
            // Usually scraper uses root .env or its own.
        }

        console.log('✅ Env file uploaded.');

        console.log('Restarting server to pick up new env...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });

        console.log('✅ Server restarted.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        ssh.dispose();
    }
}

uploadEnv();
