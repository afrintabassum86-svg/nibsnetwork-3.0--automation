import Tesseract from 'tesseract.js';
import { supabase } from '../lib/supabase-admin.js';

async function runOCRMatching() {
    console.log("=== Visual OCR Headline Matching (Supabase Edition) ===\n");

    // 1. Load Articles from Supabase
    const { data: articles, error: artError } = await supabase.from('blog_articles').select('*');
    if (artError) {
        console.error("✗ Could not load articles:", artError.message);
        return;
    }

    // 2. Load Unmapped Posts from Supabase
    const { data: posts, error: postError } = await supabase
        .from('instagram_posts')
        .select('*')
        .is('blog_url', null);

    if (postError) {
        console.error("✗ Could not load posts:", postError.message);
        return;
    }

    console.log(`Analyzing ${posts.length} unmapped posts for visual headlines...\n`);

    const stopWords = new Set(['the', 'and', 'with', 'nibs', 'network', 'image', 'photo', 'ready', 'discover', 'unleash']);

    for (const post of posts) {
        try {
            console.log(`⌛ Processing ID: ${post.id}...`);

            // Perform OCR on the image URL directly (Supabase Storage URL)
            const { data: { text } } = await Tesseract.recognize(post.image, 'eng');

            // Clean up
            const cleanOCR = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            if (cleanOCR.length < 5) continue;

            console.log(`  Visual Text: "${cleanOCR.substring(0, 50)}..."`);

            let bestArticle = null;
            let highestScore = 0;
            const ocrWords = cleanOCR.split(' ').filter(w => w.length > 3 && !stopWords.has(w));

            for (const article of articles) {
                let score = 0;
                const articleSlug = (article.slug || '').replace(/-/g, ' ');
                const articleWords = articleSlug.split(' ').filter(w => w.length > 3 && !stopWords.has(w));

                if (cleanOCR.includes(articleSlug)) score += 100;

                const overlap = ocrWords.filter(w => articleWords.includes(w));
                score += overlap.length * 20;

                if (score > highestScore && score >= 40) {
                    highestScore = score;
                    bestArticle = article;
                }
            }

            if (bestArticle) {
                const displayTitle = bestArticle.title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                const { error: upError } = await supabase
                    .from('instagram_posts')
                    .update({
                        blog_url: bestArticle.url,
                        title: displayTitle
                    })
                    .eq('id', post.id);

                if (!upError) console.log(`  ✅ MATCH: ${displayTitle}`);
            }

        } catch (e) {
            console.error(`  Error processing ${post.id}:`, e.message);
        }
    }

    console.log(`\n=== OCR MATCHING COMPLETE ===`);
}

runOCRMatching();
