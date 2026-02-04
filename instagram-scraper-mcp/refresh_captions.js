import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase-admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.resolve(__dirname, 'browser_session');

async function refreshCaptions() {
    console.log("=== Instagram Caption Refresher (Supabase Edition) ===");

    const { data: posts, error } = await supabase
        .from('instagram_posts')
        .select('*');

    if (error) {
        console.error("✗ Could not load posts:", error.message);
        return;
    }

    const genericPosts = posts.filter(p => !p.title || p.title.toLowerCase().includes('photo by nibs network') || p.title === 'Instagram Post');

    if (genericPosts.length === 0) {
        console.log("No generic titles found! All titles look good.");
        return;
    }

    console.log(`Found ${genericPosts.length} posts with generic titles.`);
    const context = await chromium.launchPersistentContext(SESSION_DIR, {
        headless: false,
    });

    const page = await context.newPage();
    let updatedCount = 0;

    for (const post of genericPosts) {
        try {
            console.log(`\nFetching caption for: ${post.url}`);
            await page.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            const caption = await page.evaluate(() => {
                const selectors = ['h1', 'span._ap30', 'div._a9zs span', 'article div span'];
                for (const selector of selectors) {
                    const el = document.querySelector(selector);
                    if (el && el.innerText.length > 5 && !el.innerText.includes('Follow') && !el.innerText.includes('Likes')) {
                        return el.innerText;
                    }
                }
                return null;
            });

            if (caption) {
                let cleanCaption = caption.replace(/^nibsnetwork\s+/i, '').trim().split('\n')[0].substring(0, 150);
                const { error: upError } = await supabase
                    .from('instagram_posts')
                    .update({ title: cleanCaption })
                    .eq('id', post.id);

                if (!upError) {
                    updatedCount++;
                    console.log(`   ✓ Saved: ${cleanCaption}`);
                }
            }
        } catch (e) {
            console.error(`   ✗ Error:`, e.message);
        }
    }

    console.log(`\n=== DONE! Updated ${updatedCount} captions in Supabase. ===`);
    await context.close();
}

refreshCaptions();
