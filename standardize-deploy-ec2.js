import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ssh = new NodeSSH();

async function standardize() {
    try {
        await ssh.connect({
            host: '43.205.138.253',
            username: 'ubuntu',
            privateKey: fs.readFileSync(path.resolve(__dirname, 'nibsnetwork-key.pem'), 'utf8')
        });

        console.log('🚀 Connected. Standardizing deployment...');

        const OLD_DIR = '/home/ubuntu/nibsnetwork';
        const NEW_DIR = '/var/www/nibsnetwork';
        const NGINX_CONF = '/etc/nginx/sites-available/nibsnetwork';

        // 1. Move project to /var/www
        console.log('📦 Moving project to /var/www...');
        await ssh.execCommand(`sudo rm -rf ${NEW_DIR}`);
        await ssh.execCommand(`sudo cp -r ${OLD_DIR} ${NEW_DIR}`);
        await ssh.execCommand(`sudo chown -R ubuntu:www-data ${NEW_DIR}`);
        await ssh.execCommand(`sudo find ${NEW_DIR} -type d -exec chmod 755 {} +`);
        await ssh.execCommand(`sudo find ${NEW_DIR} -type f -exec chmod 644 {} +`);

        // 2. Update Nginx Config to point to new location
        console.log('📝 Updating Nginx config...');
        const configContent = `server {
    listen 80;
    server_name 43.205.138.253;

    root ${NEW_DIR}/dist;
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
}
`;
        fs.writeFileSync('nibsnetwork_std.conf', configContent);
        await ssh.putFile('nibsnetwork_std.conf', '/tmp/nibsnetwork_std.conf');
        await ssh.execCommand(`sudo mv /tmp/nibsnetwork_std.conf ${NGINX_CONF}`);

        // 3. Restart Nginx
        console.log('🔄 Restarting Nginx...');
        await ssh.execCommand('sudo systemctl restart nginx');

        // 4. Verify via localhost
        console.log('🔍 Final verification via localhost probe...');
        const res = await ssh.execCommand('curl -s http://localhost/admin/ | grep -o "AWS RDS"');
        console.log('Result:', res.stdout ? '✅ FOUND AWS RDS' : '❌ NOT FOUND - Content might be different');

        const status = await ssh.execCommand('curl -I http://localhost/admin/');
        console.log('HTTP Status:', status.stdout.split('\n')[0]);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

standardize();
