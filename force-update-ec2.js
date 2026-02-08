import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function forceUpdate() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        const REMOTE_DIR = '/home/ubuntu/nibsnetwork';
        console.log('🚀 Connected. Forcing update in ' + REMOTE_DIR);

        // 1. Reset everything
        console.log('🧹 Reseting local changes...');
        await ssh.execCommand('git reset --hard', { cwd: REMOTE_DIR });
        await ssh.execCommand('git clean -fd', { cwd: REMOTE_DIR });

        // 2. Pull
        console.log('🏃 Pulling latest code...');
        const pull = await ssh.execCommand('git pull origin main', { cwd: REMOTE_DIR });
        console.log(pull.stdout || pull.stderr);

        // 3. Build
        console.log('🏗️ Rebuilding frontend...');
        const build = await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });
        console.log(build.stdout || build.stderr);

        // 4. Restart
        console.log('🔄 Restarting PM2...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });

        // 5. Verify Build file directly
        console.log('\n👀 Verifying UI text in built files...');
        const check = await ssh.execCommand('grep -o "AWS RDS" dist/assets/*.js', { cwd: REMOTE_DIR });
        console.log('Found AWS RDS text:', check.stdout ? 'YES' : 'NO');

        const check2 = await ssh.execCommand('grep -o "Supabase" dist/assets/*.js', { cwd: REMOTE_DIR });
        console.log('Found Supabase text:', check2.stdout ? 'YES' : 'NO');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

forceUpdate();
