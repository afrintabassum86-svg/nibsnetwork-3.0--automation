import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

async function inspect() {
    console.log('🚀 Inspecting Disk Usage on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        console.log('\n===== ROOT Usage =====');
        // Check root level folders
        console.log((await ssh.execCommand('sudo du -sh /* 2>/dev/null | sort -rh | head -n 10')).stdout);

        console.log('\n===== HOME Usage =====');
        console.log((await ssh.execCommand('du -sh /home/ubuntu/* 2>/dev/null | sort -rh')).stdout);

        console.log('\n===== Project Usage =====');
        console.log((await ssh.execCommand('du -sh /home/ubuntu/nibsnetwork/* 2>/dev/null | sort -rh | head -n 10')).stdout);

        console.log('\n===== Actions Runner Usage =====');
        console.log((await ssh.execCommand('du -sh /home/ubuntu/actions-runner/* 2>/dev/null | sort -rh | head -n 10')).stdout);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

inspect();
