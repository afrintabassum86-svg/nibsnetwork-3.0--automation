# Complete Setup Guide: New AWS Account (Duplication)

This guide provides step-by-step instructions to set up the NibsNetwork project on a completely new AWS account (New EC2, New RDS, New S3).

---

## Step 1: Duplicate Code to New GitHub Repo
1. Create a new repository on GitHub.
2. In your local development folder, add the new remote:
   ```bash
   git remote add client-remote https://github.com/YOUR_USERNAME/NEW_REPO.git
   git add .
   git commit -m "Prepare for new account setup"
   git push client-remote main
   ```

---

## Step 2: EC2 Infrastructure Setup
1. **Launch Instance:** Ubuntu 22.04 LTS, t3.small (Recommended).
2. **Security Groups:** 
   - Allow Port 80 (HTTP)
   - Allow Port 22 (SSH)
   - Allow Port 3001 (Admin API - Optional if using Nginx)

---

## Step 3: Server Software Installation
Connect to your EC2 via SSH and run:
```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

---

## Step 4: Clone and Install App
```bash
git clone https://github.com/YOUR_USERNAME/NEW_REPO.git nibsnetwork
cd nibsnetwork

# Install Main Backend
npm install

# Install Scraper Dependencies
cd instagram-scraper-mcp
npm install
cd ..
```

---

## Step 5: Environment Variables (.env)
Create the `.env` file with the **NEW** AWS credentials:
```bash
nano .env
```
**Content to add:**
```env
DATABASE_HOST=your-new-rds.xxx.ap-south-1.rds.amazonaws.com
DATABASE_PORT=5432
DATABASE_NAME=postgres
DATABASE_USER=postgres
DATABASE_PASSWORD=YOUR_PASSWORD

S3_BUCKET_NAME=your-new-bucket
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=NEW_KEY
AWS_SECRET_ACCESS_KEY=NEW_SECRET

VITE_API_URL=http://YOUR_EC2_IP
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_BUSINESS_ACCOUNT_ID=your_id
```

---

## Step 6: Initial Database Sync (Create Tables)
Run the schema script to create tables in the new RDS. This command must be run **inside the `nibsnetwork` folder** on your EC2 instance.

1. **Check file location:** The `schema.sql` file is already in your project root.
2. **Execute sync:** Run this command (it uses the credentials from your `.env` file):
```bash
cd ~/nibsnetwork
node -e "import('./lib/db.js').then(db => db.query(require('fs').readFileSync('schema.sql', 'utf8')).then(() => { console.log('✅ Success: Tables Created in RDS!'); process.exit(0); }).catch(e => { console.error('❌ Error:', e); process.exit(1); }))"
```

---

## Step 7: System Optimizations
### 1. Swap Space (Stability)
Increases virtual memory so the server doesn't crash during scraping.
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo "/swapfile swap swap defaults 0 0" | sudo tee -a /etc/fstab
```

### 2. Nginx Reverse Proxy (Access via Port 80)
To add the Nginx config, you will create a new file on the server.

1. **Install Nginx:**
   ```bash
   sudo apt install nginx -y
   ```

2. **Create config file:**
   ```bash
   sudo nano /etc/nginx/sites-available/nibsnetwork
   ```

3. **Paste this content into the editor:**
   ```nginx
   server {
       listen 80;
       server_name _; 

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

4. **Link and activate:**
   ```bash
   # Enable the new config
   sudo ln -sf /etc/nginx/sites-available/nibsnetwork /etc/nginx/sites-enabled/
   
   # Remove default Nginx config
   sudo rm -f /etc/nginx/sites-enabled/default
   
   # Test and Restart
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## Step 8: Automation (Linking GitHub to EC2)

This step allows GitHub to run automation scripts on your server. Think of it as installing a "remote control" on your EC2.

### Phase 1: Open the Setup Page on GitHub
1.  Go to your **GitHub Repo** in your browser.
2.  Go to **Settings** (Top bar) > **Actions** (Left side) > **Runners**.
3.  Click **"New self-hosted runner"** (Blue button).
4.  Select **Linux** and **X64**.

### Phase 2: Copy & Paste from GitHub to EC2
GitHub will now show you 2 boxes of code. **Don't type manually, just copy and paste!**

1.  **Box 1 (Download):** Copy all 3 commands (`mkdir`, `curl`, `tar`) and paste them into your EC2 terminal.
2.  **Box 2 (Configure):** Copy the `./config.sh` command and paste it.
    *   *When it asks questions:* Just keep pressing **Enter** (the default settings are perfect).

### Phase 3: Make it Stay Alive (Service)
Once you see "Runner successfully added", run these 3 final commands to make sure it never stops working:
```bash
# 1. Install as a service
sudo ./svc.sh install

# 2. Start it
sudo ./svc.sh start

# 3. Double check status (Should say 'active')
sudo ./svc.sh status
```

---

## Step 9: Start Your App
Now that the server is ready, start your application so the website is live:
```bash
cd ~/nibsnetwork
pm2 start admin-server.js --name "admin-server"
pm2 save
pm2 startup
```

**Your setup is complete!** Access the app at `http://your-ec2-ip`.
