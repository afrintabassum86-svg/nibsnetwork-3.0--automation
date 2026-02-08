import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

async function resize() {
    console.log('🚀 Resizing Swap on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        console.log('📉 Turning off swap (this might take a moment)...');
        await ssh.execCommand('sudo swapoff -a');

        console.log('✂️ Resizing swapfile to 1GB...');
        // Delete old one first to free space immediately (risky if OOM happens during dd, but unlikely on idle system)
        await ssh.execCommand('sudo rm /swapfile');

        // Create new one
        const dd = await ssh.execCommand('sudo dd if=/dev/zero of=/swapfile bs=1M count=1024');
        console.log(dd.stderr); // dd outputs to stderr

        await ssh.execCommand('sudo mkswap /swapfile');
        await ssh.execCommand('sudo swapon /swapfile');
        await ssh.execCommand('sudo chmod 600 /swapfile');

        console.log('✅ Swap resized.');

        console.log('\n📊 Disk Space (After Resize):');
        console.log((await ssh.execCommand('df -h /')).stdout);

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        ssh.dispose();
    }
}

resize();
