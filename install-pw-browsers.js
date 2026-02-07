// Install Playwright Browsers
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function installBrowsers() {
    console.log('=== Installing Playwright Browsers ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    console.log('Installing chromium...');
    const result = await ssh.execCommand('npx playwright install chromium', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });
    console.log(result.stdout || result.stderr);

    console.log('\nRetesting...');
    const testResult = await ssh.execCommand('node test-pw.js', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });
    console.log(testResult.stdout);
    if (testResult.stderr) console.log('Stderr:', testResult.stderr);

    ssh.dispose();
}

installBrowsers();
