# AWS Deployment Guide for NibsNetwork

## Overview

This guide will help you deploy the NibsNetwork application on AWS.

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                    VERCEL                           │
│              React Frontend (Free)                  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│               AWS EC2 (t3.small)                    │
│  • Admin Server (Express.js, port 3001)             │
│  • Playwright Scrapers (Chrome headless)            │
│  • Cron Jobs (scheduling)                           │
└─────────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
┌──────────────────┐      ┌──────────────────────────┐
│    AWS S3        │      │   AWS RDS PostgreSQL     │
│  Image Storage   │      │   (db.t3.micro)          │
│                  │      │                          │
└──────────────────┘      └──────────────────────────┘
```

---

## Step 1: Create AWS S3 Bucket

1. Go to **AWS Console → S3 → Create Bucket**
2. Bucket name: `nibsnetwork-images`
3. Region: `ap-south-1` (Mumbai) 
4. Uncheck "Block all public access"
5. Create bucket

### Bucket Policy (for public image access):
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::nibsnetwork-images/*"
        }
    ]
}
```

---

## Step 2: Create RDS PostgreSQL Database

1. Go to **AWS Console → RDS → Create Database**
2. Choose:
   - Engine: PostgreSQL
   - Template: Free tier
   - Instance: db.t3.micro
   - Storage: 20 GB
3. Settings:
   - DB identifier: `nibsnetwork-db`
   - Master username: `postgres`
   - Master password: (save this!)
4. Connectivity:
   - Public access: **Yes** (for initial setup) or Use VPC
   - Security group: Allow port 5432 from EC2

### After Creation:
1. Note down the **Endpoint** (e.g., `nibsnetwork-db.xxxxx.ap-south-1.rds.amazonaws.com`)
2. Connect using pgAdmin or psql
3. Run `schema.sql` to create tables:
```bash
psql -h YOUR_RDS_ENDPOINT -U postgres -d nibsnetwork -f schema.sql
```

---

## Step 3: Create EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose:
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: t3.small (2 vCPU, 2 GB RAM)
   - Key pair: Create new or use existing
3. Network settings:
   - Allow SSH (port 22)
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)
   - Add rule: Custom TCP, port 3001

### SSH into EC2:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

### Install Dependencies:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Playwright dependencies
sudo npx playwright install-deps chromium
npx playwright install chromium

# Install Git
sudo apt install -y git

# Clone your repository
git clone https://github.com/YOUR_USERNAME/NIBSNETWORK_Blogsite_Automation.git
cd NIBSNETWORK_Blogsite_Automation

# Install dependencies
npm install
cd instagram-scraper-mcp && npm install && cd ..
```

---

## Step 4: Configure Environment Variables

Create `.env` file on EC2:
```bash
nano .env
```

Add:
```env
# AWS Credentials
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
AWS_REGION=ap-south-1
S3_BUCKET_NAME=nibsnetwork-images

# PostgreSQL (RDS)
DATABASE_HOST=nibsnetwork-db.xxxxx.ap-south-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=nibsnetwork
DATABASE_USER=postgres
DATABASE_PASSWORD=YOUR_PASSWORD

# API URL
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:3001
```

---

## Step 5: Start Application with PM2

```bash
# Start admin server
pm2 start admin-server.js --name "admin-server"

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

---

## Step 6: Setup Cron Jobs

```bash
# Edit crontab
crontab -e

# Add these lines (run sync every 6 hours):
0 */6 * * * cd /home/ubuntu/NIBSNETWORK_Blogsite_Automation && node instagram-scraper-mcp/crawl_blog.js >> /var/log/nibs-sync.log 2>&1
0 */6 * * * cd /home/ubuntu/NIBSNETWORK_Blogsite_Automation && node instagram-scraper-mcp/map_to_blog.js >> /var/log/nibs-map.log 2>&1
```

---

## Step 7: Setup Nginx (Optional - for Production)

```bash
sudo apt install nginx -y

sudo nano /etc/nginx/sites-available/nibsnetwork
```

Add:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/nibsnetwork /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 8: Update Vercel Frontend

In Vercel dashboard, add environment variable:
```
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:3001
```

Or if using Nginx with domain:
```
VITE_API_URL=https://api.yourdomain.com
```

---

## Estimated Monthly Cost

| Service | Specification | Cost |
|---------|--------------|------|
| EC2 | t3.small | ~$15 |
| RDS | db.t3.micro | ~$15 |
| S3 | ~1GB | ~$1 |
| **Total** | | **~$31/month** |

💡 **Tip**: Use 1-year Reserved Instances to save up to 40%!

---

## Troubleshooting

### Check logs:
```bash
pm2 logs admin-server
```

### Restart server:
```bash
pm2 restart admin-server
```

### Test database connection:
```bash
node -e "require('./lib/db.js').query('SELECT 1').then(r => console.log('Connected!', r.rows)).catch(console.error)"
```

### Test S3 upload:
```bash
node -e "require('./lib/s3-helper.js').uploadToS3('test.txt', 'Hello', 'text/plain').then(console.log).catch(console.error)"
```
