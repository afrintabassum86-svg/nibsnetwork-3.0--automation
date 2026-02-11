import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EC2_IP = '43.205.228.79';
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const REMOTE_DIR = '/home/ubuntu/nibsnetwork';

async function setupS3() {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({
            host: EC2_IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('✅ Connected to EC2');

        const setupS3Script = `
import { S3Client, CreateBucketCommand, PutPublicAccessBlockCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "ap-south-1" });
const bucketName = "nibsnetwork-khaikhai-images";

async function run() {
    try {
        console.log('Creating bucket: ' + bucketName);
        await client.send(new CreateBucketCommand({ 
            Bucket: bucketName,
            CreateBucketConfiguration: { LocationConstraint: "ap-south-1" }
        }));
        console.log('✅ Bucket created.');

        // Disable block public access
        await client.send(new PutPublicAccessBlockCommand({
            Bucket: bucketName,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: false,
                IgnorePublicAcls: false,
                BlockPublicPolicy: false,
                RestrictPublicBuckets: false
            }
        }));

        // Set Public Read Policy
        const policy = {
            Version: "2012-10-17",
            Statement: [{
                Sid: "PublicRead",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource: \\\`arn:aws:s3:::\\\${bucketName}/*\\\`
            }]
        };
        await client.send(new PutBucketPolicyCommand({
            Bucket: bucketName,
            Policy: JSON.stringify(policy)
        }));
        console.log('✅ Public policy applied.');

    } catch (e) {
        if (e.name === 'BucketAlreadyOwnedByYou') {
            console.log('ℹ️ Bucket already exists and is owned by you.');
        } else {
            console.error('Error:', e.message);
        }
    }
}
run();
`;
        await ssh.execCommand('cat > setup_s3.js << "EOF"\n' + setupS3Script + '\nEOF', { cwd: REMOTE_DIR });

        // We need to make sure @aws-sdk/client-s3 is installed
        console.log('Ensuring AWS SDK is installed...');
        await ssh.execCommand('npm install @aws-sdk/client-s3', { cwd: REMOTE_DIR });

        const res = await ssh.execCommand('node setup_s3.js', { cwd: REMOTE_DIR });
        console.log(res.stdout || res.stderr);

        if (res.stdout.includes('✅') || res.stdout.includes('already exists')) {
            console.log('Updating .env files with new bucket...');
            await ssh.execCommand("sed -i 's|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=nibsnetwork-khaikhai-images|' .env", { cwd: REMOTE_DIR });
            await ssh.execCommand("sed -i 's|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=nibsnetwork-khaikhai-images|' instagram-scraper-mcp/.env", { cwd: REMOTE_DIR });

            console.log('🔄 Restarting PM2...');
            await ssh.execCommand('pm2 restart admin-server');

            console.log('\n--- Repopulating Data (Fresh Fetch and S3 Upload) ---');
            await ssh.execCommand('node instagram-scraper-mcp/fetch_api.js', { cwd: REMOTE_DIR });
            console.log('✅ S3 Isolation and Repopulation Complete.');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

setupS3();
