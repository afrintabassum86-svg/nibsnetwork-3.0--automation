import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.138.253';

async function restartClean() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected');

        console.log('--- Checking for ecosystem.config.js ---');
        const checkEco = await ssh.execCommand('ls ecosystem.config.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(checkEco.stdout.trim() ? 'Found ecosystem config' : 'No ecosystem config');

        console.log('--- Stopping admin-server ---');
        await ssh.execCommand('pm2 delete admin-server', { cwd: '/home/ubuntu/nibsnetwork' });

        console.log('--- Starting admin-server ---');
        // Explicitly load .env if necessary, though dotenv in code should handle it
        // We use --update-env just in case, though delete/start resets it usually
        const res = await ssh.execCommand('pm2 start admin-server.js --name "admin-server"', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(res.stdout || res.stderr);

        console.log('--- Verifying Env ---');
        // We use a small script to print env of running process to be sure
        const verifyScript = `
        const pm2 = require('pm2');
        pm2.connect(function(err) {
            if (err) process.exit(2);
            pm2.describe('admin-server', (err, list) => {
                if (err) process.exit(3);
                if (list[0]) {
                    console.log('DB:', list[0].pm2_env.DATABASE_URL);
                    console.log('S3:', list[0].pm2_env.S3_BUCKET_NAME);
                }
                pm2.disconnect();
            });
        });
        `;
        await ssh.execCommand('cat > verify_env.js << "EOF"\n' + verifyScript + '\nEOF', { cwd: '/home/ubuntu/nibsnetwork' });
        const verifyRes = await ssh.execCommand('node verify_env.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log('Active Env:\n', verifyRes.stdout || verifyRes.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

restartClean();
