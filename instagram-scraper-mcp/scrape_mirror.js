import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadToS3 } from '../lib/s3-helper.js';
import pool, { query } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MIRRORS = [
    {
        name: 'Dumpoir',
        url: 'https://dumpoir.com/v/nibsnetwork',
        selector: '.content-box img, .grid-item img, .card-img-top'
    },
    {
        name: 'Instanavigation',
        url: 'https://instanavigation.com/user-profile/nibsnetwork',
        selector: '.posts-grid img, .profile-posts img, img[src*="instagram"], img[src*="cdn"]'
    },
    {
        name: 'Imginn',
        url: 'https://imginn.com/nibsnetwork/',
        selector: '.items .item img, .post-items .item img'
    }
];

async function scrapeMirror() {
    console.log("Launching browser for Multi-Mirror Scrape...");
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--window-position=0,0',
            '--ignore-certificate-errors',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        ignoreDefaultArgs: ['--enable-automation']
    });

    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    let posts = [];

    try {
        for (const mirror of MIRRORS) {
            console.log(`\n--- Trying Mirror: ${mirror.name} ---`);
            try {
                await page.goto(mirror.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                await page.waitForTimeout(5000);

                // Check for Cloudflare/Blocking
                const title = await page.title();
                if (title.includes('Just a moment') || title.includes('Attention Required')) {
                    console.log(`  Blocked by Cloudflare (${title}). Skipping...`);
                    continue;
                }

                posts = await page.evaluate((sel) => {
                    const items = Array.from(document.querySelectorAll(sel));
                    return items.map((img, index) => {
                        if (!img || img.width < 100) return null;

                        const src = img.src || img.getAttribute('data-src');
                        // Try to find caption in parent/siblings
                        let el = img;
                        let caption = img.alt || "";
                        // Traverse up 3 levels to find text
                        for (let i = 0; i < 3; i++) {
                            if (el.parentElement) {
                                el = el.parentElement;
                                const textEl = el.innerText;
                                if (textEl && textEl.length > caption.length) caption = textEl;
                            }
                        }

                        const finalCaption = (caption || "Instagram Post").replace(/\n/g, " ").trim();
                        const title = finalCaption.length > 200 ? finalCaption.substring(0, 200) + "..." : finalCaption;

                        return {
                            id: `ig-${Date.now()}-${index}`,
                            title: title.replace(/['"]/g, ""),
                            url: "https://www.instagram.com/nibsnetwork/",
                            image: src,
                            type: "post"
                        };
                    }).filter(Boolean);
                }, mirror.selector);

                if (posts.length > 0) {
                    console.log(`  ✅ Success! Found ${posts.length} posts on ${mirror.name}.`);
                    break; // Stop if we found posts
                } else {
                    console.log(`  ❌ No posts found on ${mirror.name} (Selector mismatch?).`);
                }
            } catch (e) {
                console.log(`  ❌ Error scraping ${mirror.name}: ${e.message}`);
            }
        }

        if (posts.length === 0) {
            console.error("\n❌ ALL MIRRORS FAILED. No posts found.");
        } else {
            console.log(`\nProcessing ${posts.length} posts...`);
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
                    } else {
                        // Fallback: Use original URL if fetch fails
                        post.image = post.image; // Keep original
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
        console.error("Scrape Critical Fail:", e.message);
    } finally {
        await browser.close();
        if (typeof pool !== 'undefined') await pool.end();
    }
}

scrapeMirror();
