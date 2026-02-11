import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function cleanup() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const script = `
import { query } from './lib/db.js';
try {
    await query("TRUNCATE TABLE instagram_posts CASCADE");
    await query("TRUNCATE TABLE blog_articles CASCADE");
    console.log("✅ Database tables truncated.");
} catch (e) {
    console.error("❌ Error:", e.message);
}
process.exit(0);
        `;
        await ssh.execCommand('cat > truncate_db.js << "EOF"\n' + script + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node truncate_db.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

cleanup();
