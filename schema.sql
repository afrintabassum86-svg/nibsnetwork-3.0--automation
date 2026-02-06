-- ============================================
-- NibsNetwork Database Schema for AWS RDS
-- Run this after creating your RDS database
-- ============================================

-- Instagram Posts Table
CREATE TABLE IF NOT EXISTS instagram_posts (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT,
    url TEXT NOT NULL,
    image TEXT,
    type VARCHAR(20) DEFAULT 'image',
    blog_url TEXT,
    timestamp TIMESTAMPTZ,
    manual_edit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Articles Table
CREATE TABLE IF NOT EXISTS blog_articles (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    category VARCHAR(100),
    slug VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Script Status Table (for tracking automation)
CREATE TABLE IF NOT EXISTS script_status (
    id SERIAL PRIMARY KEY,
    script_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'idle',
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    output TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON instagram_posts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_posts_blog_url ON instagram_posts(blog_url);
CREATE INDEX IF NOT EXISTS idx_articles_category ON blog_articles(category);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_instagram_posts_updated_at
    BEFORE UPDATE ON instagram_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_script_status_updated_at
    BEFORE UPDATE ON script_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default script status row
INSERT INTO script_status (script_name, status) 
VALUES ('global', 'idle')
ON CONFLICT DO NOTHING;
