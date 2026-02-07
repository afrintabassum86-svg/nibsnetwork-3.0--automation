// Fix Nginx Configuration
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function fixNginx() {
    console.log('=== Fixing Nginx Config ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    const nginxConfig = `
server {
    listen 80;
    server_name ${EC2_IP};
    
    root /var/www/html;
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
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Assets with correct MIME types
    location ~* \.(js|mjs)$ {
        types { application/javascript js mjs; }
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location ~* \.(css)$ {
        types { text/css css; }
        expires 1y;
    }

    location ~* \.(png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
    }
}`;

    console.log('Updating Nginx config...');
    await ssh.execCommand(`echo '${nginxConfig}' | sudo tee /etc/nginx/sites-available/nibsnetwork`);

    console.log('Restarting Nginx...');
    const result = await ssh.execCommand('sudo nginx -t && sudo systemctl restart nginx');
    console.log(result.stdout || result.stderr);

    console.log('\n✓ Nginx Updated!');
    ssh.dispose();
}

fixNginx();
