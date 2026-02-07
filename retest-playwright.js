// Retest Playwright
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function retest() {
    console.log('=== Retesting Playwright ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    // Run Test with correct ESM Syntax
    console.log('Running test...');

    const testScript = `
    import { chromium } from 'playwright';
    
    (async () => {
        try {
            console.log('Launching browser...');
            const browser = await chromium.launch({ 
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'] 
            });
            console.log('Browser launched!');
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
    const result = await ssh.execCommand('node test-pw.js', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });

    console.log(result.stdout);
    if (result.stderr) console.log('Stderr:', result.stderr);

    ssh.dispose();
}

retest();
