import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function fixNginx() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        const REMOTE_DIR = '/home/ubuntu/nibsnetwork';
        const TEMP_PATH = '/tmp/nibsnetwork.conf';
        const FINAL_PATH = '/etc/nginx/sites-available/nibsnetwork';

        console.log('🚀 Connected. Creating local Nginx config...');

        const configContent = `server {
    listen 80;
    server_name 43.205.138.253;

    root ${REMOTE_DIR}/dist;
    index index.html;

    include /etc/nginx/mime.types;

    # Gzip settings
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Handle assets explicitly
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;

        const LOCAL_TEMP = path.resolve(__dirname, 'nibsnetwork.conf');
        fs.writeFileSync(LOCAL_TEMP, configContent);

        console.log('Uploading config to EC2...');
        await ssh.putFile(LOCAL_TEMP, TEMP_PATH);

        console.log('Moving config to final destination...');
        await ssh.execCommand(`sudo mv ${TEMP_PATH} ${FINAL_PATH}`);

        // Ensure it's enabled (if not already)
        await ssh.execCommand(`sudo ln -sf ${FINAL_PATH} /etc/nginx/sites-enabled/nibsnetwork`);

        console.log('Testing Nginx config...');
        const test = await ssh.execCommand('sudo nginx -t');
        if (test.stderr && test.stderr.includes('syntax is ok')) {
            console.log('✅ Syntax OK. Reloading Nginx...');
            await ssh.execCommand('sudo systemctl restart nginx');
            console.log('✅ Nginx restarted!');
        } else {
            console.error('❌ Nginx syntax error:\n', test.stderr || test.stdout);
        }

        // Cleanup local temp
        fs.unlinkSync(LOCAL_TEMP);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

fixNginx();
