#!/bin/bash
NEW_TOKEN="EAAMhsf7N0N8BQnksVZBG0S4rtpwZCT6eslrvn89cMFroZCW2MAiplUv3sZCPZAq3Ek77okKbhNLPxuq1gVbbP0qqljPPaOtkA025SSGZBbaz9lPFgd13RZCBWJYZBhSxhhE6UOazhjOViEs8kZCZApSlqInI7AeEYGzYNYlYpfw6FCg3l5MFpj7UoM4WjNl6Nh1OgZB7otXJ6QEnbiJiC2j"
NEW_IG_ID="101744898691822"
NEW_DB="nibsnetwork_hayret"
NEW_BUCKET="nibsnetwork-hayret-images"
RDS_HOST="nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com"
PGPASSWORD="NibsNetwork2026"
REGION="ap-south-1"

echo "--- 1. Creating Database if not exists ---"
export PGPASSWORD
psql -h $RDS_HOST -U postgres -d nibsnetwork -tc "SELECT 1 FROM pg_database WHERE datname = '$NEW_DB'" | grep -q 1 || \
psql -h $RDS_HOST -U postgres -d nibsnetwork -c "CREATE DATABASE $NEW_DB"

echo "--- 2. Setting up Tables ---"
psql -h $RDS_HOST -U postgres -d $NEW_DB << 'EOF'
CREATE TABLE IF NOT EXISTS instagram_posts (id TEXT PRIMARY KEY, title TEXT, url TEXT, image TEXT, type TEXT, blog_url TEXT, timestamp TIMESTAMPTZ, manual_edit BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS blog_articles (id SERIAL PRIMARY KEY, title TEXT, url TEXT UNIQUE, category TEXT, slug TEXT, created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS script_status (id SERIAL PRIMARY KEY, status TEXT DEFAULT 'idle', script_name TEXT, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, output TEXT, updated_at TIMESTAMPTZ DEFAULT NOW());
INSERT INTO script_status (id, status, script_name) VALUES (1, 'idle', 'none') ON CONFLICT (id) DO NOTHING;
EOF

echo "--- 3. Setting up S3 Bucket ---"
aws s3api head-bucket --bucket "$NEW_BUCKET" 2>/dev/null || \
aws s3api create-bucket --bucket "$NEW_BUCKET" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"

aws s3api put-public-access-block --bucket "$NEW_BUCKET" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

POLICY='{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicRead",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::'$NEW_BUCKET'/*"
        }
    ]
}'
aws s3api put-bucket-policy --bucket "$NEW_BUCKET" --policy "$POLICY"

echo "--- 4. Updating .env files ---"
NEW_URL="postgresql://postgres:${PGPASSWORD}@${RDS_HOST}:5432/${NEW_DB}"

sed -i "s|INSTAGRAM_ACCESS_TOKEN=.*|INSTAGRAM_ACCESS_TOKEN=${NEW_TOKEN}|" .env
sed -i "s|INSTAGRAM_BUSINESS_ACCOUNT_ID=.*|INSTAGRAM_BUSINESS_ACCOUNT_ID=${NEW_IG_ID}|" .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" .env
sed -i "s|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=${NEW_BUCKET}|" .env
sed -i "s|AWS_S3_BUCKET_NAME=.*|AWS_S3_BUCKET_NAME=${NEW_BUCKET}|" .env

# Also update scraper env
sed -i "s|INSTAGRAM_ACCESS_TOKEN=.*|INSTAGRAM_ACCESS_TOKEN=${NEW_TOKEN}|" instagram-scraper-mcp/.env
sed -i "s|INSTAGRAM_BUSINESS_ACCOUNT_ID=.*|INSTAGRAM_BUSINESS_ACCOUNT_ID=${NEW_IG_ID}|" instagram-scraper-mcp/.env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" instagram-scraper-mcp/.env
sed -i "s|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=${NEW_BUCKET}|" instagram-scraper-mcp/.env
sed -i "s|AWS_S3_BUCKET_NAME=.*|AWS_S3_BUCKET_NAME=${NEW_BUCKET}|" instagram-scraper-mcp/.env

echo "--- 5. Restarting PM2 ---"
pm2 restart admin-server

echo "✅ HAYRET TURKEY SETUP COMPLETE ON OLD EC2."
