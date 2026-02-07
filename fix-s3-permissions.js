import { S3Client, PutPublicAccessBlockCommand, PutBucketPolicyCommand, PutBucketOwnershipControlsCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'nibsnetwork-images';

async function makeBucketPublic() {
    console.log(`Step 1: Disabling "Block Public Access" for bucket: ${BUCKET_NAME}...`);
    try {
        await s3Client.send(new PutPublicAccessBlockCommand({
            Bucket: BUCKET_NAME,
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: false,
                IgnorePublicAcls: false,
                BlockPublicPolicy: false,
                RestrictPublicBuckets: false
            }
        }));
        console.log("✅ Block Public Access disabled.");

        console.log("Step 2: Enabling Object Ownership (ACLs enabled)...");
        await s3Client.send(new PutBucketOwnershipControlsCommand({
            Bucket: BUCKET_NAME,
            OwnershipControls: {
                Rules: [
                    {
                        ObjectOwnership: 'BucketOwnerPreferred'
                    }
                ]
            }
        }));
        console.log("✅ Object Ownership configured.");

        console.log("Step 3: Applying Public Read Policy...");
        const policy = {
            Version: "2012-10-17",
            Statement: [
                {
                    Sid: "PublicReadGetObject",
                    Effect: "Allow",
                    Principal: "*",
                    Action: "s3:GetObject",
                    Resource: `arn:aws:s3:::${BUCKET_NAME}/*`
                }
            ]
        };

        await s3Client.send(new PutBucketPolicyCommand({
            Bucket: BUCKET_NAME,
            Policy: JSON.stringify(policy)
        }));
        console.log("✅ Bucket Policy applied successfully.");

        console.log("\n🚀 SUCCESS! Your S3 bucket is now public. Images should be visible in the browser now.");

    } catch (error) {
        console.error("❌ ERROR configuring S3 bucket:", error.message);
        if (error.Code === 'AccessDenied') {
            console.error("Access Denied: Your IAM user might not have permission to change bucket policies.");
        }
    }
}

makeBucketPublic();
