import { chromium } from 'playwright';
import { uploadToS3 } from './lib/s3-helper.js';
import pool, { query } from './lib/db.js';

// ---- CONFIG ----
const TIMEOUT_SECONDS = 90; // 1.5 Minutes

async function manualScrape() {
    console.log("Launching browser for Manual Scrape (via Instanavigation Mirror)...");
    console.log("Navigating to Instanavigation/nibsnetwork...");
    console.log("NO LOGIN REQUIRED. Just wait or scroll if needed.");
    console.log(`You have ${TIMEOUT_SECONDS} SECONDS...`);

    const browser = await chromium.launch({
        headless: false,
        channel: 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--start-maximized'
        ]
    });

    const context = await browser.newContext({ viewport: null });
    const page = await context.newPage();

    try {
        // Use a Mirror site that is easier to scrape visually
        await page.goto('https://instanavigation.com/user-profile/nibsnetwork', { waitUntil: 'domcontentloaded' });

        // Wait for user interaction
        for (let i = TIMEOUT_SECONDS; i > 0; i--) {
            if (i % 10 === 0) console.log(`Time remaining: ${i} seconds...`);
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log("Time's up! Scraping visible posts...");

        const posts = await page.evaluate(() => {
            // Selectors for Instanavigation
            // Usually .posts-grid .item or similar
            // Try generic image strategy again but on this simpler site

            const images = Array.from(document.querySelectorAll('img'));

            return images.map((img, index) => {
                const rect = img.getBoundingClientRect();
                if (rect.width < 150) return null; // Ignore small UI elements

                let src = img.src || img.getAttribute('data-src');
                // Ensure src is absolute/valid
                if (!src || src.startsWith('data:')) return null;

                const alt = img.alt || "Instagram Post";
                const title = alt.length > 200 ? alt.substring(0, 200) + "..." : alt;

                return {
                    id: `ig-insta-nav-${Date.now()}-${index}`,
                    title: title.replace(/['"]/g, ""),
                    url: "https://www.instagram.com/nibsnetwork/", // Fallback URL
                    image: src,
                    type: "post"
                };
            }).filter(Boolean);
        });

        if (posts.length === 0) {
            console.error("❌ No posts found. (Selectors failed).");
        } else {
            console.log(`Found ${posts.length} potential posts. Uploading to S3...`);
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

        console.log("Closing browser...");
        await browser.close();

    } catch (e) {
        console.error("Scrape Error:", e);
    } finally {
        pool.end();
    }
}

manualScrape();
