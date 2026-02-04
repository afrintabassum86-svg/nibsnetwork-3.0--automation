import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
        // GreatFon URL structure might vary, trying generic search or direct
        await page.goto('https://greatfon.com/v/nibsnetwork', { waitUntil: 'domcontentloaded' });

        // Wait for content (generic .content or img)
        await page.waitForTimeout(5000);

        const posts = await page.evaluate(() => {
            // GreatFon structure varies. Look for images in grid
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
                    url: "https://www.instagram.com/nibsnetwork/", // Generic link
                    image: src,
                    type: "post"
                };
            }).filter(Boolean);
        });

        if (posts.length > 0) {
            console.log(`Found ${posts.length} posts. Downloading...`);
            const publicPostsDir = path.resolve(__dirname, '../public/posts');
            if (!fs.existsSync(publicPostsDir)) fs.mkdirSync(publicPostsDir, { recursive: true });

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
                        const filename = `${post.id}.jpg`;
                        const filePath = path.join(publicPostsDir, filename);
                        fs.writeFileSync(filePath, Buffer.from(imageBuffer, 'base64'));
                        post.image = `/posts/${filename}`;
                        finalPosts.push(post);
                    }
                } catch (e) { }
            }

            if (finalPosts.length > 0) {
                const fileContent = `export const INSTAGRAM_POSTS = ${JSON.stringify(finalPosts, null, 2)};\n`;
                const outputPath = path.resolve(__dirname, '../src/constants.js');
                fs.writeFileSync(outputPath, fileContent);
                console.log(`SUCCESS: Synced ${finalPosts.length} posts.`);
            }
        } else {
            console.log("No posts found on GreatFon.");
        }

    } catch (e) {
        console.error("Scrape failed:", e.message);
    } finally {
        await browser.close();
    }
}

scrapeMirror();
