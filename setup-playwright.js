// Configure EC2 for Playwright (Swap + Test)
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function setupPlaywright() {
    console.log('=== Configuring Playwright on EC2 ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    try {
        // 1. Add Swap Memory (2GB) - Critical for t3.small
        console.log('Step 1: Checking Swap Memory...');
        const checkSwap = await ssh.execCommand('swapon --show');
        if (!checkSwap.stdout) {
            console.log('Adding 2GB Swap file for stability...');
            await ssh.execCommand('sudo fallocate -l 2G /swapfile');
            await ssh.execCommand('sudo chmod 600 /swapfile');
            await ssh.execCommand('sudo mkswap /swapfile');
            await ssh.execCommand('sudo swapon /swapfile');
            await ssh.execCommand('echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab');
            console.log('✓ Swap added!');
        } else {
            console.log('✓ Swap already exists.');
        }

        // 2. Install Playwright Dependencies (Verify)
        console.log('\nStep 2: verifying Playwright dependencies...');
        const deps = await ssh.execCommand('npx playwright install-deps chromium', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });
        console.log(deps.stdout || deps.stderr);

        // 3. Run a simple Playwright Test
        console.log('\nStep 3: Running Playwright Test...');
        const testScript = `
        const { chromium } = require('playwright');
        (async () => {
            try {
                console.log('Launching browser...');
                const browser = await chromium.launch({ headless: true });
                const page = await browser.newPage();
                await page.goto('https://example.com');
                const title = await page.title();
                console.log('Page Title:', title);
                await browser.close();
                console.log('SUCCESS: Playwright is working!');
            } catch (e) {
                console.error('ERROR:', e);
                process.exit(1);
            }
        })();
        `;

        await ssh.execCommand(`echo "${testScript}" > test-pw.js`, { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });
        const testResult = await ssh.execCommand('node test-pw.js', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });

        console.log('--- Test Output ---');
        console.log(testResult.stdout);
        console.log(testResult.stderr);

        if (testResult.stdout.includes('SUCCESS')) {
            console.log('\n✅ PLAYWRIGHT IS READY!');
        } else {
            console.log('\n❌ PLAYWRIGHT FAILED. Check logs above.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }

    ssh.dispose();
}

setupPlaywright();
