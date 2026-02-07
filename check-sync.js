import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function checkSyncLogs() {
    const ssh = new NodeSSH();
    try {
        console.log('Connecting to EC2...');
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✓ Connected!\n');

        // Check if any child processes are running
        console.log('--- Running Node Processes ---');
        const processes = await ssh.execCommand('ps aux | grep node');
        console.log(processes.stdout);

        // Check fetch_api.js logs if any
        console.log('\n--- Recent fetch_api output ---');
        const fetchLogs = await ssh.execCommand('cat /tmp/fetch_api.log 2>/dev/null || echo "No fetch log found"');
        console.log(fetchLogs.stdout);

        // Run the sync manually to see output
        console.log('\n--- Testing fetch_api.js ---');
        const testSync = await ssh.execCommand('cd /home/ubuntu/nibsnetwork && timeout 30 node instagram-scraper-mcp/fetch_api.js 2>&1 || echo "Timeout or error"');
        console.log(testSync.stdout);
        if (testSync.stderr) console.log('STDERR:', testSync.stderr);

        ssh.dispose();
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkSyncLogs();
