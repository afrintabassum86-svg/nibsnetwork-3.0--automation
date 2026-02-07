// Debug Run Scripts Manually on EC2
import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function debugRun() {
    console.log('=== Running Scripts Manually on EC2 ===\n');

    const ssh = new NodeSSH();
    await ssh.connect({
        host: EC2_IP,
        username: 'ubuntu',
        privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
    });

    try {
        // 1. Pull latest code first
        console.log('Pulling latest code...');
        await ssh.execCommand('git pull origin main', { cwd: '/home/ubuntu/nibsnetwork' });

        // 2. Install dependencies (just in case)
        console.log('Installing dependencies...');
        await ssh.execCommand('npm install', { cwd: '/home/ubuntu/nibsnetwork/instagram-scraper-mcp' });

        // 3. Run crawl_blog.js
        console.log('\n--- Running crawl_blog.js ---');
        const crawl = await ssh.execCommand('node instagram-scraper-mcp/crawl_blog.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(crawl.stdout);
        if (crawl.stderr) console.log('Stderr:', crawl.stderr);


        // 4. Run scrape.js
        /*
        console.log('\n--- Running scrape.js (Headless) ---');
        const scrape = await ssh.execCommand('node instagram-scraper-mcp/scrape.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(scrape.stdout);
        if (scrape.stderr) console.log('Stderr:', scrape.stderr);
        */

    } catch (error) {
        console.error('Error:', error.message);
    }

    ssh.dispose();
}

debugRun();
