// Deploy to EC2 via SSH commands
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';
const GITHUB_REPO = 'https://github.com/afrintabassum86-svg/nibsnetwork-3.0--automation.git';

async function deploy() {
    console.log('=== Deploying to EC2 ===\n');
    console.log(`EC2 IP: ${EC2_IP}`);
    console.log(`Repository: ${GITHUB_REPO}\n`);

    const ssh = new NodeSSH();

    try {
        // Connect to EC2
        console.log('Step 1: Connecting to EC2...');
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✓ Connected!\n');

        // Clone repository (Schema & Backend)
        console.log('Step 2: Cloning repository...');
        await ssh.execCommand('rm -rf nibsnetwork', { cwd: '/home/ubuntu' });
        const cloneResult = await ssh.execCommand(`git clone ${GITHUB_REPO} nibsnetwork`, { cwd: '/home/ubuntu' });
        console.log(cloneResult.stdout || '✓ Repository cloned');

        // Step 2.5: Upload production build and updated server files
        console.log('\nStep 2.5: Syncing local changes to EC2...');

        // Upload Frontend
        await ssh.putDirectory('./dist', '/home/ubuntu/nibsnetwork/dist', {
            recursive: true,
            concurrency: 10
        });

        // Upload Updated Server
        await ssh.putFile('./admin-server.js', '/home/ubuntu/nibsnetwork/admin-server.js');

        // Upload Updated Fetch Script
        await ssh.putFile('./instagram-scraper-mcp/fetch_api.js', '/home/ubuntu/nibsnetwork/instagram-scraper-mcp/fetch_api.js');

        console.log('✓ Files synced successfully');

        // Create .env file on EC2
        console.log('\nStep 3: Creating .env file...');
        const envContent = fs.readFileSync('.env', 'utf8');
        await ssh.execCommand(`cat > /home/ubuntu/nibsnetwork/.env << 'ENVEOF'
${envContent}
ENVEOF`);
        console.log('✓ .env file created');

        // Install dependencies
        console.log('\nStep 4: Installing dependencies...');
        await ssh.execCommand('rm -rf node_modules package-lock.json', { cwd: '/home/ubuntu/nibsnetwork' });
        const npmResult = await ssh.execCommand('npm install --production', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(npmResult.stdout || '✓ Main dependencies installed');

        await ssh.execCommand('rm -rf node_modules package-lock.json', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });
        const npmResult2 = await ssh.execCommand('npm install --production', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });
        console.log(npmResult2.stdout || '✓ Scraper dependencies installed');

        // Start with PM2
        console.log('\nStep 5: Starting server with PM2...');
        await ssh.execCommand('pm2 delete admin-server 2>/dev/null || true', { cwd: '/home/ubuntu/nibsnetwork' });
        const pm2Result = await ssh.execCommand('pm2 start admin-server.js --name admin-server', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(pm2Result.stdout || '✓ Server started with PM2');

        // Save PM2 config
        await ssh.execCommand('pm2 save');
        console.log('✓ PM2 config saved');

        // Get status
        const statusResult = await ssh.execCommand('pm2 list');
        console.log('\nPM2 Status:');
        console.log(statusResult.stdout);

        console.log('\n🎉 DEPLOYMENT COMPLETE!');
        console.log('================================');
        console.log(`Admin API: http://${EC2_IP}:3001`);
        console.log(`Health Check: http://${EC2_IP}:3001/api/ping`);
        console.log('================================\n');

        ssh.dispose();

    } catch (error) {
        console.error('✗ Deployment Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('1. Make sure EC2 instance is running');
        console.log('2. Wait 2-3 minutes after EC2 creation for user-data script');
        console.log('3. Check security group allows port 22');
        ssh.dispose();
    }
}

deploy();
