#!/bin/bash
# Deployment script for EC2

# Navigate to app directory
cd /home/ubuntu

# Clone or pull the repository (replace with your GitHub repo if available)
# git clone https://github.com/YOUR_USERNAME/nibsnetwork.git nibsnetwork

# For now, create the directory structure
mkdir -p nibsnetwork
cd nibsnetwork

# The files will be uploaded via SCP

# Install dependencies
npm install

# Install playwright
cd instagram-scraper-mcp && npm install && cd ..

# Start with PM2
pm2 start admin-server.js --name "admin-server"
pm2 save
pm2 startup

echo "Deployment complete!"
