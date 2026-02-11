import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function diagnoseNewEc2() {
    const ssh = new NodeSSH();
    console.log(`Connecting to NEW EC2 (${IP})...`);

    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- 1. Checking API Response ---');
        // Check if returns JSON array
        const api = await ssh.execCommand('curl -s http://localhost:3001/api/instagram-posts');
        console.log('Status Code:', api.stdout.startsWith('[') ? 'OK (JSON)' : 'Possible Error');
        console.log('Length:', api.stdout.length);
        console.log('First 200 chars:', api.stdout.substring(0, 200));

        console.log('\n--- 2. Checking DB Count ---');
        const dbCheck = await ssh.execCommand('export PGPASSWORD="NibsNetwork2026"; psql -h nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com -U postgres -d nibsnetwork_khaikhai -c "SELECT count(id) FROM instagram_posts;"');
        console.log(dbCheck.stdout || dbCheck.stderr);

        console.log('\n--- 3. Checking PM2 Logs ---');
        const logs = await ssh.execCommand('pm2 logs admin-server --lines 50 --nostream');
        console.log(logs.stdout || logs.stderr);

        console.log('\n--- 4. Checking .env S3_BUCKET ---');
        const env = await ssh.execCommand('grep S3_BUCKET_NAME .env', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(env.stdout);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

diagnoseNewEc2();
