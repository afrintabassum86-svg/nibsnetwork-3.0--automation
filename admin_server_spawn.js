import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { query } from './lib/db.js';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSTANTS_PATH = path.resolve(__dirname, 'src/constants.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static files from the React app build
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/ping', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// API to save mappings
app.post('/api/save-posts', async (req, res) => {
    try {
        const { posts } = req.body;
        if (!posts || !Array.isArray(posts)) return res.status(400).json({ error: 'Invalid posts data' });
        console.log(`[Admin] Saving ${posts.length} posts...`);
        for (const post of posts) {
            await query(
                `INSERT INTO instagram_posts (id, title, url, image, type, blog_url, timestamp, manual_edit)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                 ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, url=EXCLUDED.url, image=EXCLUDED.image, type=EXCLUDED.type, blog_url=EXCLUDED.blog_url, timestamp=EXCLUDED.timestamp, manual_edit=true`,
                [post.id, post.title, post.url, post.image, post.type, post.blogUrl, post.timestamp]
            );
        }
        const fileContent = `export const INSTAGRAM_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
        fs.writeFileSync(CONSTANTS_PATH, fileContent);
        res.json({ success: true });
    } catch (error) {
        console.error('[Admin Error]', error);
        res.status(500).json({ error: error.message });
    }
});

// API to update a single post mapping
app.post('/api/update-post-mapping', async (req, res) => {
    try {
        const { postId, blogUrl, title } = req.body;
        if (!postId || !blogUrl) return res.status(400).json({ error: 'Missing postId or blogUrl' });
        let q = 'UPDATE instagram_posts SET blog_url = $1';
        let p = [blogUrl];
        if (title) { q += ', title = $2 WHERE id = $3'; p.push(title, postId); }
        else { q += ' WHERE id = $2'; p.push(postId); }
        await query(q, p);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/articles', async (req, res) => {
    try {
        const result = await query('SELECT title, url, category, slug FROM blog_articles ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/posts', async (req, res) => {
    try {
        const result = await query('SELECT id, title, url, image, type, blog_url, timestamp FROM instagram_posts ORDER BY timestamp DESC NULLS LAST');
        res.json(result.rows.map(p => ({ id: p.id, title: p.title, url: p.url, image: p.image, type: p.type, blogUrl: p.blog_url, timestamp: p.timestamp })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Script Status API
app.get('/api/script-status', async (req, res) => {
    try {
        const result = await query('SELECT * FROM script_status WHERE id = 1');
        res.json(result.rows[0] || { status: 'idle' });
    } catch (err) { res.json({ status: 'idle', error: err.message }); }
});

// Automation Scripts Execution with Live Streaming
app.post('/api/run-script', async (req, res) => {
    const { script } = req.body;
    let scriptPath = '';

    switch (script) {
        case 'sync-insta': case 'fetch-api': scriptPath = 'instagram-scraper-mcp/fetch_api.js'; break;
        case 'sync-blog': scriptPath = 'instagram-scraper-mcp/crawl_blog.js'; break;
        case 'auto-map': scriptPath = 'instagram-scraper-mcp/ocr_match.js'; break;
        case 'time-sync': scriptPath = 'instagram-scraper-mcp/sync_timestamps.js'; break;
        default: return res.status(400).json({ error: 'Unknown script' });
    }

    console.log(`[Admin] Spawning: node ${scriptPath}`);

    await query("UPDATE script_status SET status = 'running', script_name = $1, start_time = NOW(), output = '' WHERE id = 1", [script]);

    const child = spawn('node', [scriptPath], { cwd: __dirname });
    let combinedOutput = '';
    let lastUpdate = Date.now();

    const updateDB = async (force = false) => {
        if (force || (Date.now() - lastUpdate > 1500)) { // Update every 1.5s
            await query("UPDATE script_status SET output = $1 WHERE id = 1", [combinedOutput]);
            lastUpdate = Date.now();
        }
    };

    child.stdout.on('data', (data) => {
        combinedOutput += data.toString();
        updateDB();
    });

    child.stderr.on('data', (data) => {
        combinedOutput += data.toString();
        updateDB();
    });

    child.on('close', async (code) => {
        const status = code === 0 ? 'completed' : 'error';
        combinedOutput += `\n--- Process finished with code ${code} ---`;
        await query("UPDATE script_status SET status = $1, end_time = NOW(), output = $2 WHERE id = 1", [status, combinedOutput]);
        console.log(`[Admin] Script ${script} finished with code ${code}`);
    });

    res.json({ success: true, message: 'Script started' });
});

// All other GET requests serve the React app
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        return res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
    next();
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Admin Server running at http://0.0.0.0:${PORT}`);
});
