import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = './nibsnetwork-key.pem';

async function resetScriptStatus() {
    const ssh = new NodeSSH();
    try {
        console.log('Connecting to EC2...');
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✓ Connected!\n');

        console.log('Resetting script_status in database...');
        const reset = await ssh.execCommand(`cd /home/ubuntu/nibsnetwork && node -e "
            import('./lib/db.js').then(async ({query}) => {
                await query(\\\"UPDATE script_status SET status = 'idle', script_name = 'global', output = '' WHERE id = 1\\\");
                console.log('✓ Script status reset to idle');
                process.exit(0);
            });
        "`);
        console.log(reset.stdout);
        if (reset.stderr) console.log('INFO:', reset.stderr);

        ssh.dispose();
        console.log('\n✓ Done! Refresh the admin page.');
    } catch (e) {
        console.error('Error:', e.message);
    }
}

resetScriptStatus();
