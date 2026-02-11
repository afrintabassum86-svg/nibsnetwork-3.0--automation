import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function runRemote() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- Uploading SDK Bucket Script ---');
        await ssh.putFile('create_bucket_sdk.js', '/home/ubuntu/nibsnetwork/create_bucket_sdk.js');

        console.log('--- Running SDK Bucket Script ---');
        const res = await ssh.execCommand('node create_bucket_sdk.js', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

runRemote();
