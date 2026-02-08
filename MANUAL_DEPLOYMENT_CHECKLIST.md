# Complete Manual Deployment Checklist (EC2 to GitHub)

This document is a step-by-step manual guide to setting up your entire infrastructure from scratch.

---

## Phase 1: AWS Infrastructure Setup (Web Console)

### 1. EC2 Instance Launch
1.  **AMI:** Ubuntu Server 24.04 LTS (HVM)
2.  **Instance Type:** `t3.medium` (4GB RAM) highly recommended, or `t3.small` (2GB RAM).
3.  **Storage:** 20 GB gp3 SSD.
4.  **Security Group (Inbound Rules):**
    *   SSH (Port 22) - Your IP
    *   HTTP (Port 80) - Anywhere
    *   Custom TCP (Port 3001) - Anywhere (for Admin API)

### 2. RDS Database Launch
1.  **Engine:** PostgreSQL (Free Tier or db.t3.micro).
2.  **Public Access:** Yes (if you want to connect from local, otherwise No).
3.  **Database Name:** `nibsnetwork`
4.  **Credentials:** Save your Master Username and Password.

### 3. S3 Bucket
1.  **Name:** `nibsnetwork-images`
2.  **Public Access:** Uncheck "Block all public access".
3.  **Policy:** Add the "PublicReadGetObject" policy (refer to AWS_DEPLOYMENT_REFRESHED.md).

---

## Phase 2: Server Configuration (SSH Terminal)

### 1. Update & Node.js
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx
sudo npm install -g pm2
```

### 2. Playwright Dependencies (Crucial)
```bash
sudo npx playwright install-deps chromium
```

### 3. Setup Swap Space (If using 2GB RAM)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## Phase 3: Code & Environment Setup

### 1. Clone & Install
```bash
git clone <YOUR_GITHUB_REPO_URL>
cd NIBSNETWORK_Blogsite_Automation
npm install
cd instagram-scraper-mcp && npm install && cd ..
```

### 2. Environment Variables
Create `.env` file manually:
```bash
nano .env
```
Paste your RDS, S3, and API credentials there.

---

## Phase 4: Nginx & SSL (Manual Proxy)

### 1. Nginx Config
```bash
sudo nano /etc/nginx/sites-available/nibsnetwork
```
Paste your server block (routing Port 80 to 3001 and serving `/dist` for frontend).

### 2. Enable Config
```bash
sudo ln -s /etc/nginx/sites-available/nibsnetwork /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Phase 5: GitHub Integration (Self-Hosted Runner)

### 1. Add Runner in GitHub
1.  Go to **GitHub Repo -> Settings -> Actions -> Runners**.
2.  Click **New self-hosted runner**.
3.  Select **Linux** -> **X64**.
4.  Copy and Paste the commands provided by GitHub into your EC2 terminal.

### 2. Configure as Service
```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

---

## Phase 6: Launch & Monitor

### 1. Start App with PM2
```bash
pm2 start admin-server.js --name "admin-api"
pm2 save
pm2 startup
```

### 2. Check Logs
```bash
pm2 logs admin-api
tail -f /var/log/nginx/error.log
```

---

## Final Health Check
- [ ] Visit `http://your-ec2-ip/` -> Should show Frontend.
- [ ] Visit `http://your-ec2-ip/api/ping` -> Should show "pong".
- [ ] Run `node instagram-scraper-mcp/fetch_api.js` manually to test DB+S3.
