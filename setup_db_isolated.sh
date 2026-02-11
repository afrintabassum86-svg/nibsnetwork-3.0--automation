#!/bin/bash
export PGPASSWORD='NibsNetwork2026'
RDS_HOST='nibsnetwork-db.c3gwc80imt1l.ap-south-1.rds.amazonaws.com'
DB_NAME='nibsnetwork'
NEW_DB='nibsnetwork_khaikhai'

echo "--- 1. Creating Database if not exists ---"
# Connect to nibsnetwork to create the new DB
psql -h $RDS_HOST -U postgres -d $DB_NAME -tc "SELECT 1 FROM pg_database WHERE datname = '$NEW_DB'" | grep -q 1 || \
psql -h $RDS_HOST -U postgres -d $DB_NAME -c "CREATE DATABASE $NEW_DB"

echo "--- 2. Creating Tables in $NEW_DB ---"
psql -h $RDS_HOST -U postgres -d $NEW_DB << 'EOF'
CREATE TABLE IF NOT EXISTS instagram_posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    url TEXT,
    image TEXT,
    type TEXT,
    blog_url TEXT,
    timestamp TIMESTAMPTZ,
    manual_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blog_articles (
    id SERIAL PRIMARY KEY,
    title TEXT,
    url TEXT UNIQUE,
    category TEXT,
    slug TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS script_status (
    id SERIAL PRIMARY KEY,
    status TEXT DEFAULT 'idle',
    script_name TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    output TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO script_status (id, status, script_name) 
VALUES (1, 'idle', 'none') 
ON CONFLICT (id) DO NOTHING;
EOF

echo "--- 3. Verification ---"
psql -h $RDS_HOST -U postgres -d $NEW_DB -c "\dt; SELECT count(*) FROM script_status;"
