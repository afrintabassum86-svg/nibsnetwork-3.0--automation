# NibsNetwork Automation 4.0 - New EC2 Setup & Deployment Guide

This document contains the step-by-step commands and procedures used to duplicate the project to the new EC2 instance (`43.205.228.79`) and set up the GitHub repository `Nibsnetwork_automation 4.0`.

---

## Part 1: GitHub Repository Creation (4.0)

Steps followed to create the new repository and push the current code:

1. **Create Repository via GH CLI:**
   ```bash
   gh repo create "Nibsnetwork_automation 4.0" --public
   ```

2. **Add New Remote to Current Project:**
   ```bash
   git remote add automation-v4 https://github.com/afrintabassum86-svg/Nibsnetwork_automation-4.0.git
   ```

3. **Push Code to New Repo:**
   ```bash
   git add .
   git commit -m "Update for duplication to new EC2"
   git push automation-v4 main
   ```

---

## Part 2: Connecting to Existing AWS Resources (RDS & S3)

The new EC2 instance needs to be configured to talk to your existing AWS database and storage. This is done via the `.env` file.

### 1. Configuration in `.env` File
On the new EC2, navigate to the `nibsnetwork` folder and create/edit the `.env` file:
```bash
cd ~/nibsnetwork
nano .env
```

Add your existing RDS and S3 details here:
```env
# AWS Credentials (IAM User)
AWS_ACCESS_KEY_ID=YOUR_EXISTING_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_EXISTING_SECRET_KEY
AWS_REGION=ap-south-1

# S3 Bucket (Existing)
S3_BUCKET_NAME=nibsnetwork-images

# PostgreSQL (Existing RDS)
DATABASE_HOST=nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=nibsnetwork
DATABASE_USER=postgres
DATABASE_PASSWORD=YOUR_DB_PASSWORD

# Public API URL (New EC2 IP)
VITE_API_URL=http://43.205.228.79:3001
```

### 2. AWS Security Group Update (IMPORTANT!)
Your RDS database may have a firewall that only allows the old IP. You MUST do this:
1. Go to **AWS Console > RDS > Databases > nibsnetwork-db**.
2. Click on the **Security Group** link.
3. Add an **Inbound Rule**:
   - Type: `PostgreSQL` (Port 5432)
   - Source: `43.205.228.79/32` (New EC2 IP)
   - Description: `Allow New EC2 v4`

---

## Part 3: New EC2 Instance Launch

The new EC2 was launched with the following specifications:
- **Instance Type:** t3.small (2 vCPU, 2 GB RAM)
- **AMI:** Ubuntu 22.04 LTS
- **Security Group:** `nibsnetwork-v4-sg` (Ports 22, 80, 3001 opened)
- **IP Address:** `43.205.228.79`

---

## Part 3: Server Setup & Configuration (Inside EC2)

Once the EC2 was ready, the following commands were executed (via automated script) to prepare the environment:

### 1. Install System Dependencies
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Install Process Manager (PM2)
sudo npm install -g pm2

# Install Playwright dependencies (for Scraping)
sudo npx playwright install-deps chromium
npx playwright install chromium
```

### 2. Implementation of Project Code
```bash
# Clone the 4.0 Repository
git clone https://github.com/afrintabassum86-svg/Nibsnetwork_automation-4.0.git nibsnetwork
cd nibsnetwork

# Install Main Dependencies
npm install

# Install Scraper Dependencies
cd instagram-scraper-mcp && npm install && cd ..
```

### 3. Environment & IP Configuration
To remove dependencies on the old IP (`43.205.138.253`), the following search-and-replace was performed inside the `nibsnetwork` folder on the server:

```bash
# Replace old IP with new IP in all project files
grep -rli "43.205.138.253" . --exclude-dir={node_modules,.git} | xargs -i@ sed -i "s/43.205.138.253/43.205.228.79/g" @

# Rebuild Frontend (to bake in the new VITE_API_URL)
npm run build
```

---

## Part 4: Service Management (PM2)

Starting the Admin Server as a background service:

```bash
# Start the server
pm2 start admin-server.js --name "admin-server"

# Ensure it starts on server reboot
pm2 save
pm2 startup
```

---

## Part 5: GitHub Actions Runner Setup

To enable automated syncing on the new EC2:

1. **Download & Extract Runner:**
   ```bash
   mkdir actions-runner && cd actions-runner
   curl -o actions-runner-linux-x64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
   tar xzf ./actions-runner-linux-x64-2.321.0.tar.gz
   ```

2. **Configure with Repository Token:**
   ```bash
   ./config.sh --url https://github.com/afrintabassum86-svg/Nibsnetwork_automation-4.0 --token <YOUR_TOKEN> --name ec2-v4-runner --unattended --replace
   ```

3. **Install as a Service:**
   ```bash
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```

---

## Part 6: Post-Setup Verification Commands

Commands to verify the setup is working:

- **Check Connections:** `node -e "require('./lib/db.js').query('SELECT NOW()').then(console.log)"`
- **Check Memory:** `free -h`
- **Check Disk Space:** `df -h`
- **Check App Status:** `pm2 status`

---

## Part 7: Performance & Security Setup

To ensure the server is robust and secure, follow these steps:

### 1. Setup 1GB Swap Memory
Since the EC2 instance has 2GB RAM and limited disk space (8GB), creating a 1GB swap file prevents crashes without filling the disk.

```bash
# Create a 1GB swap file
sudo fallocate -l 1G /swapfile

# Set correct permissions
sudo chmod 600 /swapfile

# Configure swap
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent (adds to fstab)
echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab

# Verify
free -h
```

### 2. Setup Nginx Reverse Proxy
Nginx allows you to access the app on Port 80 (standard HTTP) instead of Port 3001.

```bash
# Install Nginx
sudo apt update
sudo apt install -y nginx

# Create a new configuration file
sudo nano /etc/nginx/sites-available/nibsnetwork
```

**Config Content:**
```nginx
server {
    listen 80;
    server_name 43.205.228.79; # Your NEW EC2 IP

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable & Restart:**
```bash
# Link the config
sudo ln -sf /etc/nginx/sites-available/nibsnetwork /etc/nginx/sites-enabled/

# Remove default config
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart
sudo nginx -t
sudo systemctl restart nginx
```

---
**Status:** All components (Swap, Nginx, Runner, RDS, S3) are configured.
**Live URL:** http://43.205.228.79
