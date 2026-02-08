import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function freshBuild() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        const REMOTE_DIR = '/home/ubuntu/nibsnetwork';
        console.log('🚀 Connected. Fresh build in ' + REMOTE_DIR);

        // 1. Verify Source Code
        console.log('\n🔍 Verifying src/AdminPortal.jsx on server...');
        const grepFix = await ssh.execCommand('grep "AWS RDS" src/AdminPortal.jsx', { cwd: REMOTE_DIR });
        console.log('grep "AWS RDS":', grepFix.stdout || 'NOT FOUND');

        const grepOld = await ssh.execCommand('grep "Supabase" src/AdminPortal.jsx', { cwd: REMOTE_DIR });
        console.log('grep "Supabase":', grepOld.stdout || 'NOT FOUND');

        // 2. Delete build artifacts
        console.log('\n🧹 Deleting dist folder and vite cache...');
        await ssh.execCommand('rm -rf dist', { cwd: REMOTE_DIR });
        await ssh.execCommand('rm -rf node_modules/.vite', { cwd: REMOTE_DIR });

        // 3. Build
        console.log('🏗️ Running npm run build...');
        const build = await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });
        console.log(build.stdout || build.stderr);

        // 4. Verify Built File
        console.log('\n👀 Verifying built index.html date...');
        const ls = await ssh.execCommand('ls -la dist/index.html', { cwd: REMOTE_DIR });
        console.log(ls.stdout);

        // 5. Restart server
        console.log('🔄 Restarting PM2...');
        await ssh.execCommand('pm2 restart admin-server', { cwd: REMOTE_DIR });

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

freshBuild();
