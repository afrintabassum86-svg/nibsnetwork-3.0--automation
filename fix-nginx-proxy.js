import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();
const EC2_IP = '43.205.138.253';
const KEY_PATH = './nibsnetwork-key.pem';

const nginxConfig = `server {
    listen 80;
    server_name 43.205.138.253;

    # Proxy everything to Node app on 3001
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

async function fixNginx() {
    console.log('🚀 Fixing Nginx Configuration...');

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(KEY_PATH, 'utf8')
        });
        console.log('✓ Connected');

        console.log('📝 Updating Nginx Config...');
        // Write config to temporary file
        await ssh.execCommand(`echo '${nginxConfig}' > /tmp/nibsnetwork.conf`);

        // Move to correct location with sudo
        await ssh.execCommand('sudo mv /tmp/nibsnetwork.conf /etc/nginx/sites-available/nibsnetwork.conf');

        // Verify link exists
        await ssh.execCommand('sudo ln -sf /etc/nginx/sites-available/nibsnetwork.conf /etc/nginx/sites-enabled/');

        // Test config
        const test = await ssh.execCommand('sudo nginx -t');
        if (test.code === 0) {
            console.log('✓ Nginx Config Valid');
            // Restart
            await ssh.execCommand('sudo systemctl restart nginx');
            console.log('🔄 Nginx Restarted');
        } else {
            console.error('❌ Nginx Config Invalid:', test.stderr);
        }

        ssh.dispose();

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixNginx();
