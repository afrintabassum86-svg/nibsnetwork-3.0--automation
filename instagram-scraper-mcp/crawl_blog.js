import * as cheerio from 'cheerio';
import { query } from '../lib/db.js';

const BLOG_URL = 'https://nibsnetwork.com';
const CATEGORIES = [
    'technology', 'health', 'lifestyle', 'travel',
    'cuisine', 'sports', 'aviation', 'architecture'
];

async function crawlBlog() {
    console.log("=== Blog Crawler (AWS PostgreSQL Edition) ===\n");

    let totalArticles = 0;

    for (const category of CATEGORIES) {
        const url = `${BLOG_URL}/${category}/`;
        console.log(`Crawling: ${url}`);

        try {
            const response = await fetch(url);
            const html = await response.text();
            const $ = cheerio.load(html);

            const articles = [];
            // Generic selector: find all links
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                const title = $(el).text().trim() || $(el).find('h2, h3, h4').text().trim();

                // Validation
                if (href && title && href.includes(category) && href !== url && href !== `${BLOG_URL}/${category}`) {
                    // Ensure full URL
                    const fullUrl = href.startsWith('http') ? href : `${BLOG_URL}${href.startsWith('/') ? '' : '/'}${href}`;

                    if (fullUrl.includes('nibsnetwork.com')) {
                        articles.push({
                            title: title.substring(0, 255),
                            url: fullUrl,
                            category: category,
                            slug: fullUrl.split('/').filter(Boolean).pop()
                        });
                    }
                }
            });

            // Remove duplicates
            const uniqueArticles = [...new Map(articles.map(a => [a.url, a])).values()];

            for (const article of uniqueArticles) {
                await query(
                    `INSERT INTO blog_articles (title, url, category, slug)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (url) DO UPDATE SET title = EXCLUDED.title`,
                    [article.title, article.url, article.category, article.slug]
                );
            }

            console.log(`   ✓ Found ${uniqueArticles.length} articles`);
            totalArticles += uniqueArticles.length;

        } catch (e) {
            console.error(`   ✗ Error crawling ${category}:`, e.message);
        }
    }

    console.log(`\n=== DONE! Total ${totalArticles} articles saved to PostgreSQL ===`);
}

crawlBlog();
