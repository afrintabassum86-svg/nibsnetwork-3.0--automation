import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork/instagram-scraper-mcp';

async function debugSync() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        // 1. Read the remote .env fully
        console.log('\n--- Remote .env in scraper folder ---');
        const envRes = await ssh.execCommand('cat .env', { cwd: REMOTE_DIR });
        console.log('Env Contents:', envRes.stdout);

        // 2. Run a minimal test script on the remote machine (ESM version)
        console.log('\n--- Running minimal API test on EC2 ---');
        const testScript = `
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const token = process.env.INSTAGRAM_ACCESS_TOKEN?.trim();
const id = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim();

console.log('Testing with ID:', id);
if (!token || !id) {
    console.error('Missing token or ID in .env');
    process.exit(1);
}

const url = \`https://graph.facebook.com/v21.0/\${id}?fields=username&access_token=\${token}\`;
console.log('Fetching from URL (token length:', token.length, ')');

fetch(url)
    .then(r => r.json())
    .then(d => {
        console.log('API Response:', JSON.stringify(d, null, 2));
    })
    .catch(err => console.error('Error:', err.message));
        `;

        await ssh.execCommand(`cat > diag_test_esm.js << 'EOF'\n${testScript}\nEOF`, { cwd: REMOTE_DIR });
        const runRes = await ssh.execCommand('node diag_test_esm.js', { cwd: REMOTE_DIR });
        console.log('STDOUT:', runRes.stdout);
        console.log('STDERR:', runRes.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

debugSync();
