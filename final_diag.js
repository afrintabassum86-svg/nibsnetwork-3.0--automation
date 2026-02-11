import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function finalCheck() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const diag = `
import { query } from './lib/db.js';
async function run() {
    try {
        const s = await query('SELECT current_schema()');
        console.log('ACTIVE SCHEMA:', s.rows[0].current_schema);
        const b = await query('SELECT count(*) FROM blog_articles');
        console.log('BLOG ARTICLES COUNT:', b.rows[0].count);
    } catch (e) {
        console.error('Error:', e.message);
    }
    process.exit(0);
}
run();
`;
        await ssh.execCommand('cat > final_check.js << "EOF"\n' + diag + '\nEOF', { cwd: REMOTE_DIR });
        const res = await ssh.execCommand('node final_check.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

finalCheck();
