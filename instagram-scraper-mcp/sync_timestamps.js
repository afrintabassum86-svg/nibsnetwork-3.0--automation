import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase-admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_DIR = path.resolve(__dirname, './browser_session');

async function syncTimestamps() {
    console.log("=== Instagram Timestamp Sync (Supabase Edition) ===");

    // 1. Fetch posts from Supabase that are missing timestamps
    const { data: posts, error } = await supabase
        .from('instagram_posts')
        .select('*')
        .is('timestamp', null);

    if (error) {
        console.error("✗ Could not load posts:", error.message);
        return;
    }

    if (!posts || posts.length === 0) {
        console.log("All posts already have timestamps!");
        return;
    }

    console.log(`Found ${posts.length} posts to sync.`);
    console.log("Launching browser...");

    const context = await chromium.launchPersistentContext(SESSION_DIR, {
        headless: false,
    });

    const page = await context.newPage();
    let updatedCount = 0;

    for (const post of posts) {
        try {
            console.log(`\nSyncing: ${post.id}`);
            await page.goto(post.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000);

            const timestamp = await page.evaluate(() => {
                const timeEl = document.querySelector('time');
                return timeEl ? timeEl.getAttribute('datetime') : null;
            });

            if (timestamp) {
                const { error: upError } = await supabase
                    .from('instagram_posts')
                    .update({ timestamp })
                    .eq('id', post.id);

                if (!upError) {
                    updatedCount++;
                    console.log(`   ✓ Saved: ${timestamp}`);
                }
            } else {
                console.log(`   ✗ Timestamp not found on page.`);
            }
        } catch (e) {
            console.error(`   ✗ Error:`, e.message);
        }
    }

    console.log(`\n=== DONE! Updated ${updatedCount} timestamps in Supabase. ===`);
    await context.close();
}

syncTimestamps();
