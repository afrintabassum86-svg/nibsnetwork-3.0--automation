import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase-admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.resolve(__dirname, './browser_session');

async function uploadImageToSupabase(id, imageBuffer) {
    const filename = `${id}.jpg`;
    const { data, error } = await supabase.storage
        .from('posts')
        .upload(filename, Buffer.from(imageBuffer, 'base64'), {
            contentType: 'image/jpeg',
            upsert: true
        });

    if (error) {
        console.error(`   Error uploading image ${id}:`, error.message);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filename);

    return publicUrl;
}

async function scrapePersistent() {
    console.log("=== Instagram Scraper (Supabase Edition) ===");
    console.log("");

    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });

    console.log("Launching browser...");
    const context = await chromium.launchPersistentContext(SESSION_DIR, {
        headless: false,
        viewport: { width: 1280, height: 900 },
        args: ['--start-maximized']
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    try {
        console.log("Navigating to https://www.instagram.com/nibsnetwork/");
        await page.goto('https://www.instagram.com/nibsnetwork/', { waitUntil: 'domcontentloaded' });

        console.log("\n=== WAITING FOR POSTS ===");
        let loggedIn = false;
        let waitCount = 0;
        while (!loggedIn && waitCount < 120) {
            await page.waitForTimeout(5000);
            waitCount++;
            const postCount = await page.evaluate(() => document.querySelectorAll('a[href*="/p/"] img').length).catch(() => 0);
            if (postCount > 0) {
                loggedIn = true;
                console.log(`\n✓ Found ${postCount} posts!`);
            } else {
                process.stdout.write(`\rWaiting... (${waitCount * 5}s)`);
            }
        }

        if (!loggedIn) return await context.close();

        // Load existing post IDs from Supabase to avoid double work
        const { data: existingPostsData } = await supabase.from('instagram_posts').select('id');
        const existingIds = new Set(existingPostsData?.map(p => p.id) || []);
        console.log(`Loaded ${existingIds.size} existing posts from Supabase.`);

        while (true) {
            const visiblePosts = await page.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll('a[href*="/p/"] img, a[href*="/reel/"] img'));
                return imgs.map(img => {
                    const anchor = img.closest('a');
                    if (!anchor || img.width < 150) return null;
                    const match = anchor.href.match(/\/(p|reel)\/([^\/]+)/);
                    if (!match) return null;
                    return {
                        id: `ig-${match[2]}`,
                        title: (img.alt || "Instagram Post").substring(0, 100),
                        url: anchor.href,
                        image: img.src,
                        timestamp: new Date().toISOString(),
                        type: match[1] === 'reel' ? 'video' : 'image'
                    };
                }).filter(Boolean);
            }).catch(() => []);

            if (visiblePosts.length > 0) {
                for (const post of visiblePosts) {
                    if (!existingIds.has(post.id)) {
                        console.log(`⌛ New Post Detected: ${post.id}`);
                        try {
                            const imageBuffer = await page.evaluate(async (imgUrl) => {
                                const r = await fetch(imgUrl);
                                const b = await r.blob();
                                return new Promise(res => {
                                    const reader = new FileReader();
                                    reader.onload = () => res(reader.result.split(',')[1]);
                                    reader.readAsDataURL(b);
                                });
                            }, post.image);

                            if (imageBuffer) {
                                const publicUrl = await uploadImageToSupabase(post.id, imageBuffer);
                                if (publicUrl) {
                                    post.image = publicUrl;
                                    const { error } = await supabase.from('instagram_posts').insert(post);
                                    if (!error) {
                                        existingIds.add(post.id);
                                        console.log(`   ✓ Saved to Supabase`);
                                    } else {
                                        console.error(`   ✗ Supabase Error:`, error.message);
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(`   ✗ Error capturing ${post.id}:`, e.message);
                        }
                    }
                }
            }
            await page.waitForTimeout(8000);
            process.stdout.write(`\rScanning... (${visiblePosts.length} visible, ${existingIds.size} total)`);
        }
    } catch (e) {
        console.error("\nSession ended:", e.message);
    } finally {
        await context.close();
    }
}

scrapePersistent();
