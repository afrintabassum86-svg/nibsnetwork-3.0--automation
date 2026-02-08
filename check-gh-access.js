import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';

const ssh = new NodeSSH();
const EC2_IP = '43.205.138.253';
const KEY_PATH = './nibsnetwork-key.pem';

async function checkAccess() {
    console.log('🚀 Connecting to EC2 to check GitHub access...');

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(KEY_PATH, 'utf8')
        });
        console.log('✓ Connected');

        console.log('\n--- Checking GitHub CLI Auth ---');
        const ghStatus = await ssh.execCommand('gh auth status');
        console.log(ghStatus.stdout || ghStatus.stderr || 'No output (gh might not be installed)');

        console.log('\n--- Checking for Runner Configuration ---');
        const runnerConfig = await ssh.execCommand('ls -la ~/actions-runner/.runner');
        if (runnerConfig.code === 0) {
            console.log('✅ Runner is already configured!');
        } else {
            console.log('❌ Runner is NOT configured.');
        }

        console.log('\n--- Checking SSH Keys ---');
        const sshKeys = await ssh.execCommand('ls -la ~/.ssh');
        console.log(sshKeys.stdout);

        ssh.dispose();

    } catch (error) {
        console.error('❌ Check Failed:', error);
    }
}

checkAccess();
