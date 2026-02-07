// Deploy Frontend to EC2 with Nginx
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function deployFrontend() {
    console.log('=== Deploying Frontend to EC2 ===\n');

    const ssh = new NodeSSH();

    try {
        console.log('Connecting to EC2...');
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✓ Connected!\n');

        // Install Nginx
        console.log('Step 1: Installing Nginx...');
        await ssh.execCommand('sudo apt-get update && sudo apt-get install -y nginx');
        console.log('✓ Nginx installed');

        // Build frontend on EC2
        console.log('\nStep 2: Building frontend...');

        // Update .env for production API URL
        const prodEnv = `VITE_API_URL=http://${EC2_IP}:3001`;
        await ssh.execCommand(`echo '${prodEnv}' > /home/ubuntu/nibsnetwork/.env.production`);

        const buildResult = await ssh.execCommand('npm run build', { cwd: '/home/ubuntu/nibsnetwork' });
        if (buildResult.stderr && buildResult.stderr.includes('error')) {
            console.log('Build warning:', buildResult.stderr);
        }
        console.log('✓ Frontend built');

        // Copy dist to Nginx directory
        console.log('\nStep 3: Deploying to Nginx...');
        await ssh.execCommand('sudo rm -rf /var/www/html/*');
        await ssh.execCommand('sudo cp -r /home/ubuntu/nibsnetwork/dist/* /var/www/html/');
        await ssh.execCommand('sudo chown -R www-data:www-data /var/www/html');
        console.log('✓ Files copied to Nginx');

        // Configure Nginx
        console.log('\nStep 4: Configuring Nginx...');
        const nginxConfig = `
server {
    listen 80;
    server_name ${EC2_IP};
    root /var/www/html;
    index index.html;

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}`;

        await ssh.execCommand(`echo '${nginxConfig}' | sudo tee /etc/nginx/sites-available/nibsnetwork`);
        await ssh.execCommand('sudo ln -sf /etc/nginx/sites-available/nibsnetwork /etc/nginx/sites-enabled/');
        await ssh.execCommand('sudo rm -f /etc/nginx/sites-enabled/default');

        // Test and restart Nginx
        const testResult = await ssh.execCommand('sudo nginx -t');
        console.log('Nginx test:', testResult.stderr || 'OK');

        await ssh.execCommand('sudo systemctl restart nginx');
        console.log('✓ Nginx restarted');

        // Enable Nginx on boot
        await ssh.execCommand('sudo systemctl enable nginx');

        console.log('\n🎉 FRONTEND DEPLOYED TO EC2!');
        console.log('================================');
        console.log(`Website: http://${EC2_IP}`);
        console.log(`API: http://${EC2_IP}/api/posts`);
        console.log('================================\n');

        ssh.dispose();

    } catch (error) {
        console.error('Error:', error.message);
        ssh.dispose();
    }
}

deployFrontend();
