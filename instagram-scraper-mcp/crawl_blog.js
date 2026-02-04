import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase-admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CATEGORIES = [
    'technology', 'aviation', 'architecture', 'health',
    'lifestyle', 'travel', 'cuisine', 'sports'
];

async function fetchPage(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        if (!response.ok) return null;
        return await response.text();
    } catch (e) {
        return null;
    }
}

function extractArticles(html) {
    const articles = [];
    const hrefRegex = /href=["']((https:\/\/nibsnetwork\.com)?\/([a-z-]+)\/([a-z0-9-]+)\/)["']/g;
    const EXCLUDED = ['login', 'register', 'contact-us', 'terms-of-service', 'scam-alert', 'work-with-us', 'advertising', 'charity', 'profile', 'quick-summary', 'category', 'author', 'tag', 'posts', 'about'];

    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
        const fullUrl = match[1].startsWith('/') ? `https://nibsnetwork.com${match[1]}` : match[1];
        const category = match[3];
        const slug = match[4];

        if (!EXCLUDED.includes(category) && !EXCLUDED.includes(slug) && slug.length > 5) {
            if (!articles.find(a => a.url === fullUrl)) {
                const title = slug.replace(/-/g, ' ');
                articles.push({ title, url: fullUrl, category, slug });
            }
        }
    }
    return articles;
}

async function syncArticles() {
    console.log("=== Blog Crawler (Supabase Edition) ===\n");
    let allArticles = [];

    for (const category of CATEGORIES) {
        console.log(`📁 Scanning category: ${category}`);
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= 5) {
            const url = `https://nibsnetwork.com/${category}/?page=${page}`;
            const html = await fetchPage(url);
            if (!html) break;

            const articles = extractArticles(html);
            if (articles.length === 0) break;

            for (const article of articles) {
                if (!allArticles.find(a => a.url === article.url)) {
                    allArticles.push(article);
                }
            }
            page++;
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log(`\n✓ Found ${allArticles.length} articles. Syncing to Supabase...`);

    const { error } = await supabase
        .from('blog_articles')
        .upsert(allArticles, { onConflict: 'url' });

    if (error) {
        console.error("✗ Supabase sync error:", error.message);
    } else {
        console.log("✓ Successfully synced all articles to Supabase Cloud.");
    }
}

syncArticles();
