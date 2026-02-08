import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function finalDeploy() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        const REMOTE_DIR = '/home/ubuntu/nibsnetwork';
        const FINAL_PATH = '/etc/nginx/sites-available/nibsnetwork';

        console.log('🚀 Connected. performing FINAL DEPLOY...');

        // 1. Re-enable Nginx config
        await ssh.execCommand(`sudo ln -sf ${FINAL_PATH} /etc/nginx/sites-enabled/nibsnetwork`);

        // 2. Clear old build and rebuild
        console.log('🧹 Cleaning old build...');
        await ssh.execCommand('rm -rf dist', { cwd: REMOTE_DIR });

        console.log('🏗️ Building frontend...');
        await ssh.execCommand('npm run build', { cwd: REMOTE_DIR });

        // 3. Verify dist folder
        const check = await ssh.execCommand('ls -la dist/index.html', { cwd: REMOTE_DIR });
        if (check.stdout) {
            console.log('✅ Build successful: ' + check.stdout);
        } else {
            console.log('❌ Build failed! index.html not found.');
        }

        // 4. Update Nginx Config (Latest version with no cache for index)
        const configContent = `server {
    listen 80;
    server_name 43.205.138.253;

    root ${REMOTE_DIR}/dist;
    index index.html;

    # No cache for HTML
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Cache for assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;
        const LOCAL_TEMP = path.resolve(__dirname, 'nibsnetwork.conf');
        fs.writeFileSync(LOCAL_TEMP, configContent);
        await ssh.putFile(LOCAL_TEMP, '/tmp/nibsnetwork.conf');
        await ssh.execCommand(`sudo mv /tmp/nibsnetwork.conf ${FINAL_PATH}`);

        // 5. Restart everything
        console.log('🔄 Restarting Nginx & PM2...');
        await ssh.execCommand('sudo systemctl restart nginx');
        await ssh.execCommand('pm2 restart all');

        console.log('\n✅ Deployment Complete! Please check in Incognito.');

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

finalDeploy();
