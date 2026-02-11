#!/bin/bash
NEW_BUCKET="nibsnetwork-khaikhai-images"
REGION="ap-south-1"

echo "--- 1. Creating S3 Bucket ---"
aws s3api create-bucket --bucket $NEW_BUCKET --region $REGION --create-bucket-configuration LocationConstraint=$REGION

echo "--- 2. Disabling Public Access Block ---"
aws s3api put-public-access-block \
    --bucket $NEW_BUCKET \
    --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo "--- 3. Applying Public Read Policy ---"
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
aws s3api put-bucket-policy --bucket $NEW_BUCKET --policy "$POLICY"

echo "✅ S3 Bucket Setup Complete."
