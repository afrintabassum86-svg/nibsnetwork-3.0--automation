import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../lib/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONSTANTS_PATH = path.resolve(__dirname, '../src/constants.js');

// ALL VERIFIED REAL BLOG URLs from nibsnetwork.com category pages
const BLOG_ARTICLES = [
    // ===== TECHNOLOGY =====
    { keywords: ["suni williams", "unstoppable woman"], url: "https://nibsnetwork.com/technology/meet-suni-williams/" },
    { keywords: ["jensen huang"], url: "https://nibsnetwork.com/technology/jensen-huang-poverty-to-a-rare-billionnaire/" },
    { keywords: ["tesla", "model s", "model x"], url: "https://nibsnetwork.com/technology/tesla-announces-end-of-model-s-and-model-x-production/" },
    { keywords: ["verizon outage"], url: "https://nibsnetwork.com/technology/lessons-from-the-2026-verizon-outage/" },
    { keywords: ["google sat", "sat practice", "gemini"], url: "https://nibsnetwork.com/technology/google-now-offers-free-sat-practice-exams-powered-by-gemini/" },
    { keywords: ["doomsday clock"], url: "https://nibsnetwork.com/technology/doomsday-clock-2026-how-close-the-world-is-to-danger/" },
    { keywords: ["social media banned", "children"], url: "https://nibsnetwork.com/technology/countries-where-social-media-is-banned-or-restricted-for-children/" },
    { keywords: ["ai bot", "72 hours", "deepseek"], url: "https://nibsnetwork.com/technology/72-hours-two-names-the-ai-bot-everyone-is-talking-about/" },
    { keywords: ["ai power crunch", "data centers"], url: "https://nibsnetwork.com/technology/americas-ai-power-crunch-data-centers-hit-a-wall/" },
    { keywords: ["young entrepreneurs", "startups scaling"], url: "https://nibsnetwork.com/technology/3-startups-by-young-entrepreneurs-that-are-scaling-fast-in-2026/" },
    { keywords: ["apple watch", "hypertension", "ppg sens"], url: "https://nibsnetwork.com/technology/apple-watch-detects-hypertension-everything-you-need-to-know/" },
    { keywords: ["amazon fail", "tech grocery", "amazon grocery"], url: "https://nibsnetwork.com/technology/amazon-shakes-up-its-grocery-strategy-in-2026/" },

    // ===== AVIATION =====
    { keywords: ["bombardier", "global 8000", "easa"], url: "https://nibsnetwork.com/aviation/bombardier-global-8000-earns-easa-green-light/" },
    { keywords: ["priority pass", "airport lounge", "long layover"], url: "https://nibsnetwork.com/aviation/best-priority-pass-airport-lounges-you-must-visit-in-2026/" },
    { keywords: ["luxury airport"], url: "https://nibsnetwork.com/aviation/luxury-airports-to-experience-in-2026-where-travel-feels-like-a-stay/" },
    { keywords: ["mh370", "mystery reopens"], url: "https://nibsnetwork.com/aviation/a-decades-old-mystery-reopens-what-to-know-as-the-search-for-mh370-resumes/" },
    { keywords: ["plane lands itself", "cabin pressure"], url: "https://nibsnetwork.com/aviation/plane-lands-itself-after-cabin-pressure-failure-in-historic-first/" },
    { keywords: ["bad weather", "disrupts air"], url: "https://nibsnetwork.com/aviation/bad-weather-disrupts-air-travel/" },
    { keywords: ["aviation events", "air show"], url: "https://nibsnetwork.com/aviation/upcoming-aviation-events-in-the-usa-to-watch-in-2026/" },
    { keywords: ["india airlines", "new airlines", "indigo"], url: "https://nibsnetwork.com/aviation/india-set-to-add-three-3-new-airlines-to-its-skies/" },

    // ===== HEALTH =====
    { keywords: ["world cancer day", "cancer day 2026"], url: "https://nibsnetwork.com/health/world-cancer-day-2026-meaning-facts-and-global-importance/" },
    { keywords: ["hibiscus tea", "stressed", "ruby tea"], url: "https://nibsnetwork.com/health/feeling-stressed-try-ruby-tea/" },
    { keywords: ["chia seeds", "fda recall"], url: "https://nibsnetwork.com/health/the-massive-fda-chia-seeds-recall-you-need-to-check-right-now/" },
    { keywords: ["nipah outbreak"], url: "https://nibsnetwork.com/health/everything-you-need-to-read-about-2026-nipah-outbreak/" },
    { keywords: ["salt harmony", "salt mineral", "salt:"], url: "https://nibsnetwork.com/health/salt-the-mineral-you-cant-live-without/" },
    { keywords: ["reduce obesity", "obesity"], url: "https://nibsnetwork.com/health/healthy-ways-to-reduce-obesity/" },
    { keywords: ["sugar alternative", "less sugar"], url: "https://nibsnetwork.com/health/new-year-less-sugar-6-delicious-alternatives-to-help-you-stick-to-your-resolution/" },
    { keywords: ["heart symptom", "chest pain", "jaw ache", "snoring"], url: "https://nibsnetwork.com/health/5-surprising-heart-symptoms-you-should-never-ignore-according-to-cardiologists/" },
    { keywords: ["decision fatigue", "endless choices"], url: "https://nibsnetwork.com/health/what-is-decision-fatigue-how-everyday-choices-affect-mental-health/" },
    { keywords: ["colorectal cancer", "prevent cancer"], url: "https://nibsnetwork.com/health/how-to-prevent-colorectal-cancer-simple-steps-that-can-save-lives/" },
    { keywords: ["gluten-free", "gluten free"], url: "https://nibsnetwork.com/health/7-gluten-free-foods-that-will-transform-your-diet-overnight/" },

    // ===== LIFESTYLE =====
    { keywords: ["chinese new year", "fire-horse", "year of the"], url: "https://nibsnetwork.com/lifestyle/chinese-new-year-2026-year-of-the-fire-horse/" },
    { keywords: ["subscription fatigue"], url: "https://nibsnetwork.com/lifestyle/why-subscription-fatigue-is-real-and-how-to-get-rid-of-it/" },
    { keywords: ["heath ledger", "ledger anniversary", "beyond the joker"], url: "https://nibsnetwork.com/lifestyle/remembering-heath-ledger-on-his-18th-death-anniversary/" },
    { keywords: ["snake species"], url: "https://nibsnetwork.com/lifestyle/10-countries-with-the-highest-number-of-snake-species-in-the-world/" },
    { keywords: ["investment banking", "consulting"], url: "https://nibsnetwork.com/lifestyle/investment-banking-consulting-brutal-truth-behind-the-glamour-1-get-in/" },

    // ===== TRAVEL =====
    { keywords: ["winter getaway", "warm winter"], url: "https://nibsnetwork.com/travel/6-safest-warm-winter-getaways-2026-nyc-toronto-escapes/" },
    { keywords: ["mauro morandi", "lived alone", "stillness"], url: "https://nibsnetwork.com/travel/mauro-morandi-the-man-who-lived-alone-on-an-island-for-over-30-years/" },
    { keywords: ["gen-z", "ai plan trips", "ai to plan", "ai hack travel"], url: "https://nibsnetwork.com/travel/how-gen-z-is-using-ai-to-hack-travel-in-2026/" },
    { keywords: ["blood moon", "red moon", "march 3"], url: "https://nibsnetwork.com/travel/chasing-the-red-moon-your-guide-to-the-march-3-2026-blood-moon/" },
    { keywords: ["blue zone", "okinawa"], url: "https://nibsnetwork.com/travel/the-blue-zone-can-spending-a-week-in-okinawa-change-your-life/" },

    // ===== CUISINE =====
    { keywords: ["soup", "loved soups"], url: "https://nibsnetwork.com/cuisine/20-of-the-worlds-most-loved-soups/" },
    { keywords: ["mediterranean diet", "green mediterranean"], url: "https://nibsnetwork.com/cuisine/how-the-green-mediterranean-diet-works/" },
    { keywords: ["guava-pistachio", "tiramisu", "dessert"], url: "https://nibsnetwork.com/cuisine/the-tropical-renaissance-why-guava-pistachio-tiramisu-is-taking-over/" },
    { keywords: ["seafood", "heart and brain"], url: "https://nibsnetwork.com/cuisine/15-healthiest-seafood-options-for-heart-and-brain-health/" },

    // ===== SPORTS =====
    { keywords: ["knicks", "lakers vs knicks", "madison square"], url: "https://nibsnetwork.com/sports/lakers-vs-knicks-anunobys-25-points-fuel-6th-straight-win-for-nyk/" },
    { keywords: ["sean mannion", "eagles"], url: "https://nibsnetwork.com/sports/why-sean-mannions-hiring-matters-for-the-eagles/" },
    { keywords: ["jimmy butler", "warriors", "knee injury"], url: "https://nibsnetwork.com/sports/jimmy-butlers-shocking-knee-injury-warriors-face-uncertain-road-ahead/" },
    { keywords: ["underdog revolution", "niche sports"], url: "https://nibsnetwork.com/sports/the-underdog-revolution-why-niche-sports-are-winning/" },
    { keywords: ["key sports event", "sports event 2026", "epic sports"], url: "https://nibsnetwork.com/sports/key-sports-events-to-watch-in-2026/" },
];

async function mapPostsToBlog() {
    console.log("=== Mapping Instagram Posts to VERIFIED Blog Articles (AWS PostgreSQL) ===\n");

    // Get posts from database
    const result = await query('SELECT * FROM instagram_posts');
    let posts = result.rows;

    console.log(`Processing ${posts.length} posts...\n`);

    let mappedCount = 0;

    for (const post of posts) {
        const title = (post.title || '').toLowerCase();

        for (const article of BLOG_ARTICLES) {
            if (article.keywords.some(kw => title.includes(kw.toLowerCase()))) {
                await query(
                    'UPDATE instagram_posts SET blog_url = $1 WHERE id = $2',
                    [article.url, post.id]
                );
                mappedCount++;
                console.log(`✓ Mapped: ${post.id} -> ${article.url.split('/').pop()}`);
                break;
            }
        }
    }

    // Also update constants.js for local backup
    const updatedResult = await query('SELECT * FROM instagram_posts ORDER BY timestamp DESC NULLS LAST');
    const formattedPosts = updatedResult.rows.map(p => ({
        id: p.id,
        title: p.title,
        url: p.url,
        image: p.image,
        type: p.type,
        blogUrl: p.blog_url,
        timestamp: p.timestamp
    }));

    const fileContent = `export const INSTAGRAM_POSTS = ${JSON.stringify(formattedPosts, null, 2)};\n`;
    fs.writeFileSync(CONSTANTS_PATH, fileContent);

    console.log(`\n=== SUMMARY ===`);
    console.log(`✓ Total Mapped: ${mappedCount}/${posts.length} posts`);
    console.log(`✓ Database: Updated`);
    console.log(`✓ constants.js: Updated\n`);
}

mapPostsToBlog();
