#!/bin/bash
NEW_URL="postgresql://postgres:NibsNetwork2026@nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com:5432/nibsnetwork_khaikhai"

echo "--- 1. Updating .env files ---"
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" .env
sed -i "s|DATABASE_URL=.*|DATABASE_URL=${NEW_URL}|" instagram-scraper-mcp/.env

echo "--- 2. Restarting PM2 ---"
pm2 restart admin-server

echo "--- 3. Fetching Data ---"
node instagram-scraper-mcp/fetch_api.js
node instagram-scraper-mcp/crawl_blog.js
# Optional mapping
node instagram-scraper-mcp/ocr_match.js

echo "✅ DONE."
