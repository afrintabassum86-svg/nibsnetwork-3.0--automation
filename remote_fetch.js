import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function fetchFresh() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        console.log('\n--- 1. Fetching Instagram Posts ---');
        const insta = await ssh.execCommand('node instagram-scraper-mcp/fetch_api.js', { cwd: REMOTE_DIR });
        console.log(insta.stdout);

        console.log('\n--- 2. Fetching Blog Articles ---');
        const blog = await ssh.execCommand('node instagram-scraper-mcp/crawl_blog.js', { cwd: REMOTE_DIR });
        console.log(blog.stdout);

        console.log('\n--- 3. Running Auto-Mapping ---');
        const map = await ssh.execCommand('node instagram-scraper-mcp/ocr_match.js', { cwd: REMOTE_DIR });
        console.log(map.stdout);

        console.log('\n--- 4. Running Timestamp Sync ---');
        const time = await ssh.execCommand('node instagram-scraper-mcp/sync_timestamps.js', { cwd: REMOTE_DIR });
        console.log(time.stdout);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fetchFresh();
