import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function verifyNewEc2Final() {
    const ssh = new NodeSSH();
    console.log(`Connecting to NEW EC2 (${IP})...`);

    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('--- Checking API Response ---');
        // Check if returns JSON array and length > 2 (i.e. not empty [])
        const api = await ssh.execCommand('curl -s http://localhost:3001/api/instagram-posts');
        console.log('Response Length:', api.stdout.length);
        console.log('First 100 chars:', api.stdout.substring(0, 100)); // Should look like [{"id":...

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

verifyNewEc2Final();
