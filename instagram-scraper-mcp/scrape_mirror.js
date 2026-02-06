import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToS3 } from '../lib/s3-helper.js';
import pool, { query } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function scrapeMirror() {
    console.log("Launching browser to scrape Imginn (Stealth Mode)...");
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const context = await browser.newContext({
        locale: 'en-US',
        timezoneId: 'Asia/Kolkata',
    });

    const page = await context.newPage();

    try {
        console.log('Navigating to Imginn/nibsnetwork...');
        // Try Imginn or similar mirror
        await page.goto('https://imginn.com/nibsnetwork/', { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForTimeout(5000);

        // Imginn selector strategy
        const posts = await page.evaluate(() => {
            const items = Array.from(document.querySelectorAll('.items .item, .post-items .item'));
            if (items.length === 0) return [];

            return items.map((item, index) => {
                const img = item.querySelector('img');
                const captionEl = item.querySelector('.caption, .desc');
                if (!img || img.width < 100) return null;

                const src = img.src || img.getAttribute('data-src');
                const alt = (captionEl ? captionEl.innerText : img.alt) || "Instagram Post";
                const title = alt.length > 200 ? alt.substring(0, 200) + "..." : alt;

                return {
                    id: `ig-imginn-${Date.now()}-${index}`,
                    title: title.replace(/['"]/g, ""),
                    url: "https://www.instagram.com/nibsnetwork/",
                    image: src,
                    type: "post"
                };
            }).filter(Boolean);
        });

        if (posts.length === 0) {
            console.error("❌ No posts found! Selectors might have changed or site is blocking.");
            // Print page content snippet for debugging
            const content = await page.content();
            console.log("Page snippet:", content.substring(0, 500));
        } else {
            console.log(`Found ${posts.length} posts. Uploading to S3...`);
            const finalPosts = [];
            for (const post of posts) {
                // ... same upload logic ...
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
                    } else {
                        // Fallback: Use original URL if fetch fails
                        finalPosts.push(post);
                    }
                } catch (e) { }
            }

            if (finalPosts.length > 0) {
                console.log(`Found ${finalPosts.length} valid posts. Saving to database...`);
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
