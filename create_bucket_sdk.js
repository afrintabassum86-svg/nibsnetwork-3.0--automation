import { S3Client, CreateBucketCommand, PutBucketPolicyCommand, PutPublicAccessBlockCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const REGION = process.env.AWS_REGION || 'ap-south-1';
const BUCKET = process.env.S3_BUCKET_NAME;

if (!BUCKET) {
    console.error("❌ S3_BUCKET_NAME is missing in .env");
    process.exit(1);
}

const s3 = new S3Client({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function createBucket() {
    console.log(`Checking bucket: ${BUCKET}...`);
    try {
        await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
        console.log(`✅ Bucket '${BUCKET}' already exists.`);
    } catch (err) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            console.log(`Bucket '${BUCKET}' not found. Creating...`);
            try {
                await s3.send(new CreateBucketCommand({
                    Bucket: BUCKET,
                    CreateBucketConfiguration: { LocationConstraint: REGION }
                }));
                console.log(`✅ Bucket '${BUCKET}' created.`);

                // Set Public Access
                console.log("Setting Public Access Block...");
                await s3.send(new PutPublicAccessBlockCommand({
                    Bucket: BUCKET,
                    PublicAccessBlockConfiguration: {
                        BlockPublicAcls: false,
                        IgnorePublicAcls: false,
                        BlockPublicPolicy: false,
                        RestrictPublicBuckets: false
                    }
                }));

                // Set Policy
                const policy = {
                    Version: "2012-10-17",
                    Statement: [
                        {
                            Sid: "PublicRead",
                            Effect: "Allow",
                            Principal: "*",
                            Action: "s3:GetObject",
                            Resource: `arn:aws:s3:::${BUCKET}/*`
                        }
                    ]
                };
                console.log("Setting Bucket Policy...");
                await s3.send(new PutBucketPolicyCommand({
                    Bucket: BUCKET,
                    Policy: JSON.stringify(policy)
                }));
                console.log("✅ Bucket configured public read.");

            } catch (createErr) {
                console.error("❌ Failed to create bucket:", createErr);
            }
        } else {
            console.error("❌ Error checking bucket:", err);
        }
    }
}

createBucket();
