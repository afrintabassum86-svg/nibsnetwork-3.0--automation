import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function updateEnv() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const envPaths = ['.env', 'instagram-scraper-mcp/.env'];

        for (const relPath of envPaths) {
            const p = path.join(REMOTE_DIR, relPath);
            const res = await ssh.execCommand(`cat ${relPath}`, { cwd: REMOTE_DIR });
            let content = res.stdout;

            if (content.includes('DATABASE_URL=')) {
                // Add ?options=-csearch_path%3Dkhaikhai to the URL
                // Check if options already exist
                if (!content.includes('search_path%3Dkhaikhai')) {
                    if (content.includes('?')) {
                        content = content.replace(/(DATABASE_URL=.*?)(\s|$)/, '$1&options=-csearch_path%3Dkhaikhai$2');
                    } else {
                        content = content.replace(/(DATABASE_URL=.*?)(\s|$)/, '$1?options=-csearch_path%3Dkhaikhai$2');
                    }
                    console.log(`Updating ${relPath}...`);
                    await ssh.execCommand(`cat > ${relPath} << "EOF"\n${content}\nEOF`, { cwd: REMOTE_DIR });
                    console.log(`✅ ${relPath} updated.`);
                } else {
                    console.log(`ℹ️ ${relPath} already updated.`);
                }
            }
        }

        console.log('🔄 Restarting PM2 admin-server...');
        await ssh.execCommand('pm2 restart admin-server');
        console.log('✅ Server restarted.');

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

updateEnv();
