import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function researchOCR() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        // 1. Count unmapped posts
        console.log('\n--- Checking Unmapped Posts ---');
        const countScript = `
import { query } from './lib/db.js';
const r = await query("SELECT count(*) FROM instagram_posts WHERE blog_url IS NULL");
console.log('UNMAPPED POSTS:', r.rows[0].count);
process.exit(0);
        `;
        await ssh.execCommand('cat > count_unmapped.js << "EOF"\n' + countScript + '\nEOF', { cwd: REMOTE_DIR });
        const countRes = await ssh.execCommand('node count_unmapped.js', { cwd: REMOTE_DIR });
        console.log(countRes.stdout || countRes.stderr);

        // 2. Run manual OCR to see where it hangs
        console.log('\n--- Manual Run of ocr_match.js (last 10 lines) ---');
        const ocrRes = await ssh.execCommand('node instagram-scraper-mcp/ocr_match.js', { cwd: REMOTE_DIR });
        console.log('STDOUT:', ocrRes.stdout);
        console.log('STDERR:', ocrRes.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

researchOCR();
