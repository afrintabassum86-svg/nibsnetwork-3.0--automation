import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.138.253';

async function inspect() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);

    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected');

        console.log('\n--- 1. PM2 Process Info ---');
        const pm2 = await ssh.execCommand('pm2 describe admin-server');
        console.log(pm2.stdout);

        console.log('\n--- 2. Checking admin-server.js routes ---');
        const routes = await ssh.execCommand('grep "app.get" admin-server.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(routes.stdout);

        console.log('\n--- 3. Checking for JSON files ---');
        const json = await ssh.execCommand('find . -name "*.json" -maxdepth 2', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(json.stdout);

        console.log('\n--- 4. Checking lib/db.js ---');
        const dbLib = await ssh.execCommand('cat lib/db.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(dbLib.stdout);

        console.log('\n--- 5. Checking Data via PSQL ---');
        // Check both databases just in case
        const check1 = await ssh.execCommand('export PGPASSWORD="NibsNetwork2026"; psql -h nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com -U postgres -d nibsnetwork_hayret -c "SELECT count(*) FROM instagram_posts;"');
        console.log('nibsnetwork_hayret count:', check1.stdout.trim());

        const check2 = await ssh.execCommand('export PGPASSWORD="NibsNetwork2026"; psql -h nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com -U postgres -d nibsnetwork -c "SELECT count(*) FROM instagram_posts;"');
        console.log('nibsnetwork count (original DB):', check2.stdout.trim());

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

inspect();
