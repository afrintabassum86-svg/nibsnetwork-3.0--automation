import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { supabase } from './lib/supabase-admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSTANTS_PATH = path.resolve(__dirname, 'src/constants.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API to save mappings back to Supabase
app.post('/api/save-posts', async (req, res) => {
    try {
        const { posts } = req.body;
        if (!posts || !Array.isArray(posts)) {
            return res.status(400).json({ error: 'Invalid posts data' });
        }

        console.log(`[Admin] Saving ${posts.length} posts to Supabase...`);

        // Upsert to Supabase
        const { error } = await supabase
            .from('instagram_posts')
            .upsert(posts.map(post => ({
                id: post.id,
                title: post.title,
                url: post.url,
                image: post.image,
                type: post.type,
                blog_url: post.blogUrl,
                timestamp: post.timestamp,
                manual_edit: true
            })), { onConflict: 'id' });

        if (error) throw error;

        // Also update local constants.js as a backup
        const fileContent = `export const INSTAGRAM_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
        fs.writeFileSync(CONSTANTS_PATH, fileContent);

        console.log(`[Admin] Successfully saved to Supabase and constants.js`);
        res.json({ success: true, message: 'Saved to Supabase successfully' });
    } catch (error) {
        console.error('[Admin Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// API to load articles from Supabase
app.get('/api/articles', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('blog_articles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data.map(a => ({
            title: a.title,
            url: a.url,
            category: a.category,
            slug: a.slug
        })));
    } catch (e) {
        console.error('[Admin Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// API to load posts matching frontend format
app.get('/api/posts', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('instagram_posts')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        res.json(data.map(p => ({
            id: p.id,
            title: p.title,
            url: p.url,
            image: p.image,
            type: p.type,
            blogUrl: p.blog_url,
            timestamp: p.timestamp
        })));
    } catch (e) {
        console.error('[Admin Error]', e);
        res.status(500).json({ error: e.message });
    }
});

// Automation Scripts Execution
const { exec } = await import('child_process');

app.post('/api/run-script', (req, res) => {
    const { script } = req.body;
    let command = '';

    switch (script) {
        case 'sync-insta': command = 'node instagram-scraper-mcp/scrape.js'; break;
        case 'sync-blog': command = 'node instagram-scraper-mcp/crawl_blog.js'; break;
        case 'auto-map': command = 'node instagram-scraper-mcp/ocr_match.js'; break;
        case 'sync-time': command = 'node instagram-scraper-mcp/sync_timestamps.js'; break;
        default: return res.status(400).json({ error: 'Invalid script' });
    }

    console.log(`[Admin] Executing: ${command}`);

    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Admin Error] ${error.message}`);
            return res.json({ success: false, output: stderr || error.message });
        }
        console.log(`[Admin] Script completed successfully.`);
        res.json({ success: true, output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`\n🚀 Admin Sidecar Server running at http://localhost:${PORT}`);
    console.log(`This server now syncs with Supabase Cloud.\n`);
});
