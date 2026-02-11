#!/bin/bash
NEW_BUCKET="nibsnetwork-khaikhai-images"
REGION="ap-south-1"
NEW_URL="postgresql://postgres:NibsNetwork2026@nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com:5432/nibsnetwork_khaikhai"

echo "--- 1. Setting up S3 Bucket ---"
# Create bucket if not exists
aws s3api head-bucket --bucket "$NEW_BUCKET" 2>/dev/null || \
aws s3api create-bucket --bucket "$NEW_BUCKET" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION"

# Disable Public Access Block
aws s3api put-public-access-block \
    --bucket "$NEW_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# Apply Public Read Policy
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

echo "--- 2. Updating .env files ---"
# Update DB and S3 in root .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" .env
sed -i "s|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=${NEW_BUCKET}|" .env
sed -i "s|AWS_S3_BUCKET_NAME=.*|AWS_S3_BUCKET_NAME=${NEW_BUCKET}|" .env

# Update DB and S3 in scraper .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" instagram-scraper-mcp/.env
sed -i "s|S3_BUCKET_NAME=.*|S3_BUCKET_NAME=${NEW_BUCKET}|" instagram-scraper-mcp/.env
sed -i "s|AWS_S3_BUCKET_NAME=.*|AWS_S3_BUCKET_NAME=${NEW_BUCKET}|" instagram-scraper-mcp/.env

echo "--- 3. Restarting Services ---"
pm2 restart admin-server

echo "--- 4. Repopulating Data ---"
node instagram-scraper-mcp/fetch_api.js
node instagram-scraper-mcp/crawl_blog.js

echo "✅ FULL ISOLATION COMPLETE."
