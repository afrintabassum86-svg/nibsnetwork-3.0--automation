import { NodeSSH } from 'node-ssh';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSH_KEY_PATH = path.resolve(__dirname, 'nibsnetwork-key.pem');

const EC2_INSTANCES = [
    { name: 'NEW EC2 (Khaikhai Bangali)', ip: '43.205.228.79' },
    { name: 'OLD EC2 (Hayret Turkey)', ip: '43.205.138.253' }
];

async function cleanupInstance(instance) {
    const ssh = new NodeSSH();
    console.log(`\n🧹 Cleaning up ${instance.name} (${instance.ip})...`);

    try {
        await ssh.connect({
            host: instance.ip,
            username: 'ubuntu',
            privateKey: fs.readFileSync(SSH_KEY_PATH, 'utf8')
        });

        console.log(`✅ Connected to ${instance.name}`);

        const remoteCleanupScript = `
#!/bin/bash
# 1. Truncate Tables
export PGPASSWORD='NibsNetwork2026'

# Get DB name from .env
DB_URL=$(grep DATABASE_URL .env | cut -d'/' -f4)
BUCKET=$(grep S3_BUCKET_NAME .env | cut -d'=' -f2)

echo "--- 1. Clearing Database Tables in $DB_URL ---"
psql -h nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com -U postgres -d $DB_URL -c "TRUNCATE instagram_posts, blog_articles RESTART IDENTITY;"

echo "--- 2. Clearing S3 Bucket: $BUCKET ---"
aws s3 rm s3://$BUCKET --recursive

echo "--- 3. Clearing script_status logs ---"
psql -h nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com -U postgres -d $DB_URL -c "UPDATE script_status SET status='idle', output='', start_time=NULL, end_time=NULL;"

echo "✅ COMPLETE."
`;
        await ssh.execCommand(`cat > remote_cleanup_all.sh << "EOF"\n${remoteCleanupScript}\nEOF`, { cwd: '/home/ubuntu/nibsnetwork' });
        const res = await ssh.execCommand('bash remote_cleanup_all.sh', { cwd: '/home/ubuntu/nibsnetwork' });
        console.log(res.stdout || res.stderr);

    } catch (err) {
        console.error(`❌ Error on ${instance.name}:`, err.message);
    } finally {
        ssh.dispose();
    }
}

async function runAll() {
    for (const inst of EC2_INSTANCES) {
        await cleanupInstance(inst);
    }
}

runAll();
