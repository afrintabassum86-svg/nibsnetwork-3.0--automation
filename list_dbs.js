import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function verifyDB() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('\n--- Listing Databases ---');
        const listCmd = `export PGPASSWORD='NibsNetwork2026'; psql -h nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com -U postgres -d postgres -l`;
        const res = await ssh.execCommand(listCmd);
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

verifyDB();
