import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.138.253';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

async function cleanMore() {
    console.log('🚀 Starting Deep Clean on ' + EC2_IP);
    const ssh = new NodeSSH();

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });
        console.log('✅ Connected!');

        // 1. Remove that large tarball in actions-runner
        console.log('\n🗑️ Removing Actions Runner Tarball...');
        await ssh.execCommand('rm /home/ubuntu/actions-runner/actions-runner-linux-x64-2.321.0.tar.gz');

        // 2. Reduce Journal Logs
        console.log('🗑️ Vacuuming Journal Logs to 50M...');
        await ssh.execCommand('sudo journalctl --vacuum-size=50M');

        // 3. Clean Snaps Script
        console.log('🗑️ Cleaning Old Snaps...');
        const cleanSnapScript = `
#!/bin/bash
# Removes old revisions of snaps
# CLOSE ALL SNAPS BEFORE RUNNING THIS
set -eu
snap list --all | awk '/disabled/{print $1, $3}' |
    while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision"
    done
`;
        // Write the script
        await ssh.execCommand(`echo '${cleanSnapScript}' > clean_snaps.sh`);
        await ssh.execCommand('chmod +x clean_snaps.sh');

        // Run it (might take a while)
        const snapRes = await ssh.execCommand('./clean_snaps.sh');
        console.log(snapRes.stdout);
        console.log(snapRes.stderr);

        // Remove script
        await ssh.execCommand('rm clean_snaps.sh');

        // 4. Remove man pages (optional but saves space)
        // await ssh.execCommand('sudo rm -rf /usr/share/man/*');

        // 5. Check Space
        console.log('\n📊 Disk Space (After Deep Clean):');
        console.log((await ssh.execCommand('df -h /')).stdout);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

cleanMore();
