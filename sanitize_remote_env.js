import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function sanitizeRemoteEnv() {
    console.log('🚀 Sanitizing Remote .env on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected!');

        // Sanitize the file: remove carriage returns (\r) and trailing spaces
        console.log('🧹 Removing hidden Windows characters from remote .env...');

        // Use sed to remove \r (carriage returns) from the .env files
        await ssh.execCommand("sed -i 's/\\r$//' .env", { cwd: REMOTE_DIR });
        await ssh.execCommand("sed -i 's/\\r$//' instagram-scraper-mcp/.env", { cwd: REMOTE_DIR });

        // Also trim trailing spaces from the Token line specifically
        await ssh.execCommand("sed -i 's/INSTAGRAM_ACCESS_TOKEN=\\(.*\\)[[:space:]]*$/INSTAGRAM_ACCESS_TOKEN=\\1/' .env", { cwd: REMOTE_DIR });

        console.log('✅ Remote .env sanitized.');

        // Verify with a test fetch from the server itself
        console.log('\n🧪 Testing token directly from EC2 terminal...');
        const testCmd = `node -e "
            const fs = require('fs');
            const env = fs.readFileSync('.env', 'utf8');
            const token = env.match(/INSTAGRAM_ACCESS_TOKEN=(.*)/)[1].trim();
            const id = env.match(/INSTAGRAM_BUSINESS_ACCOUNT_ID=(.*)/)[1].trim();
            console.log('Testing ID:', id);
            fetch('https://graph.facebook.com/v19.0/' + id + '?fields=username&access_token=' + token)
                .then(r => r.json())
                .then(d => {
                    if (d.error) console.log('❌ Error:', d.error.message);
                    else console.log('✅ Success! Found user:', d.username);
                });
        "`;

        const testResult = await ssh.execCommand(testCmd, { cwd: REMOTE_DIR });
        console.log(testResult.stdout || testResult.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
        process.exit();
    }
}

sanitizeRemoteEnv();
