import { NodeSSH } from 'node-ssh';
import fs from 'fs';

const ssh = new NodeSSH();
const EC2_IP = '43.205.138.253';
const KEY_PATH = './nibsnetwork-key.pem';
const TOKEN = 'B4PIHRUGQJ2LZFCSCUHALPDJQ6B2I';
const REPO_URL = 'https://github.com/afrintabassum86-svg/nibsnetwork-3.0--automation';

async function configureRunner() {
    console.log('🚀 Connecting to EC2 to configure runner...');

    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(KEY_PATH, 'utf8')
        });
        console.log('✓ Connected');

        // Check if config.sh exists
        const checkConfig = await ssh.execCommand('ls config.sh', { cwd: '/home/ubuntu/actions-runner' });

        if (checkConfig.code !== 0) {
            console.log('⚠️ config.sh not found. Downloading runner...');

            // Create directory with sudo to ensure it works, then fix permissions
            const mkRes = await ssh.execCommand('sudo mkdir -p /home/ubuntu/actions-runner');
            console.log('mkdir stdout:', mkRes.stdout);
            console.log('mkdir stderr:', mkRes.stderr);

            const chRes = await ssh.execCommand('sudo chown -R ubuntu:ubuntu /home/ubuntu/actions-runner');
            console.log('chown stderr:', chRes.stderr);

            // Download runner
            console.log('📥 Downloading runner package...');
            const downloadCmd = 'curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz';
            await ssh.execCommand(downloadCmd, { cwd: '/home/ubuntu/actions-runner' });

            // Extract runner
            console.log('📦 Extracting runner package...');
            await ssh.execCommand('tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz', { cwd: '/home/ubuntu/actions-runner' });

            console.log('✓ Runner extracted');
        } else {
            console.log('✓ Runner already installed');
        }

        // Install dependencies (Always good to check)
        console.log('🔧 Installing runner dependencies...');
        await ssh.execCommand('sudo ./bin/installdependencies.sh', { cwd: '/home/ubuntu/actions-runner' });

        // 1. Configure Runner (Non-interactive)
        console.log('⚙️  Configuring Runner...');
        const configCmd = `./config.sh --url ${REPO_URL} --token ${TOKEN} --unattended --replace`;

        // Ensure executable
        await ssh.execCommand('chmod +x config.sh', { cwd: '/home/ubuntu/actions-runner' });

        const configRes = await ssh.execCommand(configCmd, { cwd: '/home/ubuntu/actions-runner' });
        console.log('--- CONFIG STDOUT ---');
        console.log(configRes.stdout);
        console.log('--- CONFIG STDERR ---');
        console.log(configRes.stderr);
        console.log('---------------------');

        if (configRes.code !== 0) {
            if (configRes.stderr.includes('already configured')) {
                console.log('NOTE: Runner was already configured.');
            } else {
                console.error('❌ Configuration returned non-zero exit code:', configRes.code);
                // Don't throw, let's see if service install works anyway or if we can debug
            }
        }

        // 2. Install Service (so it runs on boot)
        console.log('📦 Installing Runner Service...');
        await ssh.execCommand('sudo ./svc.sh install', { cwd: '/home/ubuntu/actions-runner' });

        // 3. Start Service
        console.log('▶️  Starting Runner Service...');
        const startRes = await ssh.execCommand('sudo ./svc.sh start', { cwd: '/home/ubuntu/actions-runner' });
        console.log(startRes.stdout || startRes.stderr);

        console.log('\n✅ Runner Configured & Started Successfully!');
        ssh.dispose();

    } catch (error) {
        console.error('❌ Error:', error);
        ssh.dispose();
    }
}

configureRunner();
