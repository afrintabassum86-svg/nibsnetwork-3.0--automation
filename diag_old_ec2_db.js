import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.138.253';

async function diagnoseDB() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        const script = `
import { query } from './lib/db.js';

async function run() {
    try {
        console.log('--- Querying DB using lib/db.js ---');
        // Check active DB Connection params if possible (hard with pg pool, but query works)
        const res = await query('SELECT count(*) FROM instagram_posts');
        console.log('COUNT:', res.rows[0].count);
        
        const dbName = await query('SELECT current_database()');
        console.log('CONNECTED TO DB:', dbName.rows[0].current_database);

    } catch (e) {
        console.error('ERROR:', e.message);
    }
    process.exit(0);
}
run();
`;
        await ssh.execCommand('cat > diag_db_real.js << "EOF"\n' + script + '\nEOF', { cwd: '/home/ubuntu/nibsnetwork' });

        console.log('--- Running Diagnostic ---');
        // Use node to run it. It should pick up .env if lib/db.js loads it.
        // lib/db.js usually has 'import "dotenv/config";' or similar.
        const res = await ssh.execCommand('node diag_db_real.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

diagnoseDB();
