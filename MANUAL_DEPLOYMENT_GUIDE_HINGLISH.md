# Manual AWS Deployment & GitHub Actions Automation Guide (Hinglish)

Yeh guide aapko step-by-step batayegi kaise aap apne project ko AWS EC2 pe manually deploy karein, AWS RDS (Postgres) create karein, S3 bucket setup karein, aur GitHub Actions ke through deployment ko automate karein using a self-hosted runner.

---

## Part 1: AWS Setup (Manual)

### 1. AWS RDS (Postgres Database) Create Karna
1.  **AWS Console** mein login karke **RDS** service par jayein.
2.  **Databases** tab mein **Create database** par click karein.
3.  **Standard create** select karein aurEngine options mein **PostgreSQL** choose karein.
4.  **Templates** mein **Free tier** select karein (agar testing ke liye hai) ya **Production** (agar live traffic ke liye hai).
5.  **Settings** mein:
    -   `DB instance identifier`: `nibsnetwork-db` (koi bhi naam dein).
    -   `Master username`: `postgres` (ya apna username).
    -   `Master password`: Ek strong password set karein aur likh lein.
6.  **Connectivity** section mein:
    -   **Public access**: `Yes` select karein (agar aap local machine se connect karna chahte hain, warna `No` best practice hai).
    -   **VPC security group**: `Create new` select karein aur uska naam dein (e.g., `rds-sg`).
7.  **Create database** par click karein.
8.  Jab status **Available** ho jaye, toh **Endpoint** (Host URL) copy kar lein.

### 2. AWS S3 Bucket Create Karna
1.  **AWS Console** mein **S3** search karein.
2.  **Create bucket** par click karein.
3.  **Bucket name**: Unique naam dein (e.g., `nibsnetwork-assets-prod`).
4.  **Region**: Jo EC2 ke paas ho (e.g., `ap-south-1`).
5.  **Object Ownership**: `ACLs disabled` (Recommended).
6.  **Block Public Access**: Agar aap images public karna chahte hain, toh ise uncheck karein, warna block rehne dein aur CloudFront use karein. (Project requirement ke hisab se set karein).
7.  **Create bucket** par click karein.

### 3. EC2 Instance Launch Karna
1.  **EC2 Dashboard** par **Launch Instance** par click karein.
2.  **Name**: `NibsNetwork-Server`.
3.  **OS Image**: `Ubuntu Server 24.04 LTS` (ya 22.04 LTS).
4.  **Instance Type**: `t2.micro` (Free tier) ya `t3.small` (Better performance).
5.  **Key pair**: `Create new key pair` -> Name dein -> Download `.pem` file.
6.  **Network settings**:
    -   **Allow SSH traffic** from `My IP` (Secure) ya `Anywhere`.
    -   **Allow HTTP traffic from the internet**.
    -   **Allow HTTPS traffic from the internet**.
7.  **Launch instance** par click karein.

---

## Part 2: EC2 Server Setup (Manual)

### 1. SSH se Connect Karna
Apne terminal (Git Bash/PowerShell) se yeh command run karein (jahan `.pem` file download ki thi wahan se):
```bash
ssh -i "path/to/key.pem" ubuntu@<EC2_PUBLIC_IP>
```

### 2. Zaroori Software Install Karna
Server update karke Node.js, Git, Nginx aur PM2 install karein:
```bash
# System Update
sudo apt update && sudo apt upgrade -y

# Install Node.js (via NVM recommended usually, but direct approach here)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node Version
node -v  # Should be v20.x

# Install Git & Nginx
sudo apt install -y git nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Playwright Dependencies (Crucial for Instagram Sync)
# Bina iske scraper fail ho jayega!
npx playwright install-deps
sudo apt install -y libgbm-dev

```

### 3. Project Configuration
Project directory banayein aur permissions set karein:
```bash
# Home directory mein project folder
mkdir -p /home/ubuntu/nibsnetwork
cd /home/ubuntu/nibsnetwork
```

---

## Part 3: GitHub Runner Setup and Automation

Yahan hum **GitHub Self-Hosted Runner** setup karenge taki aapka code automatic deploy ho sake jab bhi aap `main` branch mein push karein.

### 1. GitHub Runner Ko Register Karna (GitHub Website)
1.  Apne GitHub Repo par jayein.
2.  **Settings** -> **Actions** -> **Runners** par click karein.
3.  **New self-hosted runner** par click karein.
4.  **Runner image**: `Linux` select karein.
5.  Wahah diye gaye commands ko ek-ek karke apne **EC2 Terminal** par run karein. Typically yeh kuch aise honge:

```bash
# Folder create aur download
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Configure (Token GitHub se milega)
./config.sh --url https://github.com/USERNAME/REPO --token YOUR_TOKEN_HERE
# (Saare defaults ke liye Enter press karein)

# Install Runner as Service (Important taki reboot pe bhi chale)
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

Ab aapka server GitHub se connect ho gaya hai! ✅

---

## Part 4: Create GitHub Action Workflow

Ab project root mein ek file banayein: `.github/workflows/deploy.yml`.

**File Content:**
```yaml
name: Deploy to EC2
on:
  push:
    branches:
      - main  # Jab main branch pe push ho tab chale

jobs:
  deploy:
    runs-on: self-hosted  # Use the runner on EC2
    steps:
      - name: Checkout Code
        uses: actions/checkout@v3

      - name: Install Node Dependencies
        run: |
          npm ci

      - name: Create .env file
        run: |
          echo "DATABASE_HOST=${{ secrets.DATABASE_HOST }}" > .env
          echo "DATABASE_USER=${{ secrets.DATABASE_USER }}" > .env
          echo "DATABASE_PASSWORD=${{ secrets.DATABASE_PASSWORD }}" > .env
          echo "DATABASE_NAME=${{ secrets.DATABASE_NAME }}" > .env
          echo "PORT=3001" >> .env
          # Aur jo bhi variables chahiye woh yahan add karein

      - name: Build Frontend
        run: |
          npm run build

      - name: Restart Application (PM2)
        run: |
          # Check process running or not, restart logic
          pm2 restart nibs-backend || pm2 start admin-server.js --name nibs-backend
          pm2 save
```

**Note:** Is file ko add karne se pehle, GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions** mein jake saare `secrets` (DB credentials etc.) add karein.

---

## Part 5: Final Server Configuration (Manual - One Time)

Deployment workflow run hone se pehle, ek baar manual setup complete karna zaroori hai.

### 1. Nginx Setup (Reverse Proxy)
Frontend (`dist` folder) aur Backend API (`localhost:3001`) ko connect karne ke liye.

Nginx config file create karein:
```bash
sudo nano /etc/nginx/sites-available/default
```

Is content ko paste karein (Apna EC2 IP ya Domain replace karein):
```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP_OR_DOMAIN;

    root /home/ubuntu/runner-folder/_work/REPO_NAME/REPO_NAME/dist; 
    # NOTE: path GitHub Runner ke folder structure pe depend karega. Usually:
    # /home/ubuntu/actions-runner/_work/nibs-link-in-bio/nibs-link-in-bio/dist
    
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Config check aur restart:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### 2. Setup Env Variables in GitHub Secrets
GitHub Repo Settings mein jayein aur yeh Secrets add karein:
- `DATABASE_HOST`: RDS Endpoint
- `DATABASE_USER`: Postgres User
- `DATABASE_PASSWORD`: Password
- `DATABASE_NAME`: DB Name
