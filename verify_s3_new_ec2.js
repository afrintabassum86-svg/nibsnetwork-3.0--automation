import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');
const IP = '43.205.228.79';

async function verifyBucket() {
    const ssh = new NodeSSH();
    console.log(`Connecting to ${IP}...`);
    try {
        await ssh.connect({
            host: IP,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log('\n--- 1. Checking .env S3_BUCKET_NAME ---');
        const env = await ssh.execCommand('grep S3_BUCKET_NAME .env', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(env.stdout.trim());

        const bucketName = env.stdout.split('=')[1]?.trim();

        if (bucketName) {
            console.log(`\n--- 2. Checking if Bucket '${bucketName}' Exists ---`);
            const check = await ssh.execCommand(`aws s3 ls s3://${bucketName}`, { cwd: '/home/ubuntu/nibsnetwork' });

            if (check.stderr && check.stderr.includes('NoSuchBucket')) {
                console.error('❌ BUCKET DOES NOT EXIST!');
                console.log('Attempting to create it...');
                await ssh.execCommand(`aws s3 mb s3://${bucketName} --region ap-south-1`, { cwd: '/home/ubuntu/nibsnetwork' });

                // Set public access if needed (policy)
                console.log('Unblocking public access...');
                await ssh.execCommand(`aws s3api put-public-access-block --bucket ${bucketName} --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"`, { cwd: '/home/ubuntu/nibsnetwork' });

                const policy = JSON.stringify({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicRead",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": "s3:GetObject",
                            "Resource": `arn:aws:s3:::${bucketName}/*`
                        }
                    ]
                });

                console.log('Setting bucket policy...');
                // We use a temporary file for policy to avoid quoting issues
                await ssh.execCommand(`cat > bucket_policy.json <<EOF\n${policy}\nEOF`, { cwd: '/home/ubuntu/nibsnetwork' });
                await ssh.execCommand(`aws s3api put-bucket-policy --bucket ${bucketName} --policy file://bucket_policy.json`, { cwd: '/home/ubuntu/nibsnetwork' });
                console.log('✅ Bucket created and configured.');
            } else if (check.stdout || check.stderr === '') {
                console.log('✅ Bucket exists.');
            } else {
                console.log('AWS Output:', check.stdout || check.stderr);
            }
        } else {
            console.error('❌ S3_BUCKET_NAME not found in .env');
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        ssh.dispose();
    }
}

verifyBucket();
