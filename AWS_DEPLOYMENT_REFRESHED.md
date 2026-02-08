# Refreshed AWS Deployment Guide (v3.0)

This guide outlines the deployment process for the current project structure, where the EC2 host both the Admin API and the Scraper scripts, while RDS and S3 handle data and storage.

## 1. Project Architecture (Current)
```
┌─────────────────────────────────────────────────────┐
│                   AWS EC2 (t3.small)                │
│  • Frontend: React (Port 80 via Nginx)              │
│  • Backend: Express Admin Server (Port 3001)        │
│  • Scrapers: Playwright + Tesseract OCR             │
│  • Cron Jobs: Automated Sync Scripts                │
└─────────────────────────────────────────────────────┘
          │                           │
          ▼                           ▼
┌──────────────────┐      ┌──────────────────────────┐
│    AWS S3        │      │   AWS RDS PostgreSQL     │
│  Image Storage   │      │   (db.t3.micro)          │
└──────────────────┘      └──────────────────────────┘
```

## 2. Infrastructure Requirements
- **EC2 Instance:** `t3.small` (2 vCPU, 2GB RAM) is the **absolute minimum**. `t3.medium` (4GB RAM) is recommended for smooth OCR and Browser operations.
- **Disk Space:** 10 GB Minimum (20 GB recommended to handle browser caches and logs).
- **RDS:** PostgreSQL 15+ (db.t3.micro is sufficient for basic scraping).

## 3. Deployment Steps

### Step A: System Preparation
```bash
sudo apt update && sudo apt upgrade -y
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### Step B: Playwright & OCR Setup
Playwright requires system dependencies to run Chrome:
```bash
sudo npx playwright install-deps
npx playwright install chromium
```

### Step C: Project Setup
```bash
git clone <YOUR_REPO_URL>
cd NIBSNETWORK_Blogsite_Automation
npm install
# Also install dependencies in the scraper sub-folder
cd instagram-scraper-mcp && npm install && cd ..
```

### Step D: Environment Configuration
Create a `.env` in the root directory:
```env
# RDS Connection
DATABASE_HOST=your-rds-endpoint.aws.com
DATABASE_PORT=5432
DATABASE_NAME=nibsnetwork
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password

# S3 Configuration
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=ap-south-1
S3_BUCKET_NAME=nibsnetwork-images

# Application Settings
VITE_API_URL=http://your-ec2-ip:3001
```

### Step E: Running Services
```bash
# Start Admin API
pm2 start admin-server.js --name "admin-api"

# Build Frontend (to serve via Nginx or Preview)
npm run build
```

## 4. Nginx Configuration
Nginx acts as a reverse proxy, routing traffic to your Admin API and serving the static Frontend.

```bash
sudo apt install nginx -y

# Copy your config from the project
sudo cp <PATH_TO_PROJECT>/nibsnetwork.conf /etc/nginx/sites-available/nibsnetwork
sudo ln -s /etc/nginx/sites-available/nibsnetwork /etc/nginx/sites-enabled/

# Test and Restart
sudo nginx -t
sudo systemctl restart nginx
```

## 5. Space & Memory Estimates (Full Run)

### Disk Space Calculation:
- **Project Files + node_modules:** ~500 MB
- **Playwright Browser Binaries:** ~600 MB - 800 MB
- **Tesseract Data Files:** ~50 MB - 100 MB
- **Nginx & System Packages:** ~100 MB
- **OS (Ubuntu):** ~3 GB - 4 GB
- **Logs & Temp Files:** ~500 MB (grows over time)
- **Total Disk Space Needed:** **~6 GB to 8 GB** (20 GB volume recommended).

### Memory Usage (Active Run):
- **Base System + PM2:** ~400 MB
- **Nginx (Reverse Proxy):** ~30 MB (Very lightweight)
- **Admin Server (Node.js):** ~150 MB
- **Playwright (Running):** ~600 MB - 1 GB
- **OCR Processing:** ~400 MB
- **Total Memory Peak:** **~1.7 GB to 2.3 GB**

**Verdict:** 
- **t3.micro (1GB):** Will CRASH. Do not use.
- **t3.small (2GB):** Minimum viable with **Swap File**.
- **t3.medium (4GB):** Recommended for production stability.
