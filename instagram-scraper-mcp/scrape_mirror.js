import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToS3 } from '../lib/s3-helper.js';
import pool, { query } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function scrapeMirror() {
    console.log("Launching browser to scrape GreatFon...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('Navigating to GreatFon/nibsnetwork...');
        await page.goto('https://greatfon.com/v/nibsnetwork', { waitUntil: 'domcontentloaded' });

        await page.waitForTimeout(5000);

        const posts = await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('.content-box img, .grid-item img'));
            if (images.length === 0) return [];
            return images.map((img, index) => {
                if (img.width < 100) return null;
                const src = img.src;
                const alt = img.alt || "Instagram Post";
                const title = alt.length > 60 ? alt.substring(0, 60) + "..." : alt;
                return {
                    id: `ig-gf-${Date.now()}-${index}`,
                    title: title.replace(/['"]/g, ""),
                    url: "https://www.instagram.com/nibsnetwork/",
                    image: src,
                    type: "post"
                };
            }).filter(Boolean);
        });

        if (posts.length > 0) {
            console.log(`Found ${posts.length} posts. Uploading to S3...`);
            const finalPosts = [];
            for (const post of posts) {
                try {
                    const imageBuffer = await page.evaluate(async (imgUrl) => {
                        try {
                            const response = await fetch(imgUrl);
                            const blob = await response.blob();
                            return new Promise(r => {
                                const reader = new FileReader();
                                reader.onload = () => r(reader.result.split(',')[1]);
                                reader.readAsDataURL(blob);
                            });
                        } catch (e) { return null; }
                    }, post.image);

                    if (imageBuffer) {
                        const filename = `posts/${post.id}.jpg`;
                        const publicUrl = await uploadToS3(filename, imageBuffer, 'image/jpeg');
                        if (publicUrl) {
                            post.image = publicUrl;
                            finalPosts.push(post);
                        }
                    }
                } catch (e) { }
            }

            if (finalPosts.length > 0) {
                console.log(`Found ${finalPosts.length} posts. Saving to database...`);

                for (const post of finalPosts) {
                    await query(
                        `INSERT INTO instagram_posts (id, title, url, image, type, timestamp)
                         VALUES ($1, $2, $3, $4, $5, NOW())
                         ON CONFLICT (id) DO NOTHING`,
                        [post.id, post.title, post.url, post.image, post.type]
                    );
                }
                console.log(`✓ SUCCESS: Synced ${finalPosts.length} posts to PostgreSQL`);
            }
        }
    } catch (e) {
        console.error("Scrape failed:", e.message);
    } finally {
        await browser.close();
        if (typeof pool !== 'undefined') await pool.end();
    }
}

scrapeMirror();
