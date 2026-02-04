import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

    // ===== ARCHITECTURE =====
    { keywords: ["brutalist", "raw concrete"], url: "https://nibsnetwork.com/architecture/brutalist-architecture-why-the-world-still-loves-hates-and-reconsiders-raw-concrete/" },
    { keywords: ["architecture school"], url: "https://nibsnetwork.com/architecture/5-things-your-architecture-school-wont-teach-you-but-will-make-you-a-pro/" },
    { keywords: ["embracing imperfection"], url: "https://nibsnetwork.com/architecture/embracing-imperfection-a-simple-way-to-refresh-your-home/" },
    { keywords: ["terracotta", "earth tech"], url: "https://nibsnetwork.com/architecture/the-terracotta-revival-why-earth-tech-is-the-future-of-the-global-skyline/" },
    { keywords: ["solo architect", "ai human co-design"], url: "https://nibsnetwork.com/architecture/the-end-of-the-solo-architect-the-rise-of-ai-human-co-design/" },
    { keywords: ["biophilic", "living ecosystem"], url: "https://nibsnetwork.com/architecture/biophilic-design-in-2026-transforming-spaces-into-living-ecosystems/" },
    { keywords: ["starchitect", "contextual studio"], url: "https://nibsnetwork.com/architecture/the-death-of-the-starchitect-hotel-why-2026-belongs-to-the-contextual-studio/" },
    { keywords: ["museum heist", "da vinci", "rembrandt"], url: "https://nibsnetwork.com/architecture/from-da-vinci-to-rembrandt-famous-museum-heists-through-history/" },
    { keywords: ["alchemy of light", "sunlight"], url: "https://nibsnetwork.com/architecture/the-alchemy-of-light-how-sunlight-transforms-your-homes-dna/" },
    { keywords: ["cities for architect", "architectural inspiration"], url: "https://nibsnetwork.com/architecture/10-best-cities-for-architects-to-visit-in-2026-expert-travel-guide/" },

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
    { keywords: ["aca preventive", "free check up"], url: "https://nibsnetwork.com/health/free-check-ups-that-save-lives-why-aca-preventive-care-fights-us-healthcares-affordability-nightmare/" },
    { keywords: ["gluten-free", "gluten free"], url: "https://nibsnetwork.com/health/7-gluten-free-foods-that-will-transform-your-diet-overnight/" },

    // ===== LIFESTYLE =====
    { keywords: ["kelly clarkson"], url: "https://nibsnetwork.com/lifestyle/kelly-clarkson-confirms-final-season-of-the-kelly-clarkson-show-why-shes-stepping-away-and-what-comes-next/" },
    { keywords: ["polyworking", "who owns your career"], url: "https://nibsnetwork.com/lifestyle/who-owns-your-career-try-the-emerging-power-of-polyworking/" },
    { keywords: ["grammy winner", "grammy 2026"], url: "https://nibsnetwork.com/lifestyle/grammy-winners-2026-complete-list-of-winners-performers-highlights/" },
    { keywords: ["groundhog day"], url: "https://nibsnetwork.com/lifestyle/groundhog-day-what-is-it-and-why-it-matters/" },
    { keywords: ["food inflation", "rising prices"], url: "https://nibsnetwork.com/lifestyle/food-inflation-in-america-how-rising-prices-are-changing-home-cooking/" },
    { keywords: ["subscription fatigue"], url: "https://nibsnetwork.com/lifestyle/why-subscription-fatigue-is-real-and-how-to-get-rid-of-it/" },
    { keywords: ["ray j"], url: "https://nibsnetwork.com/lifestyle/ray-js-heartbreaking-health-scare-months-to-live-warning-and-his-fight-for-survival/" },
    { keywords: ["chinese new year", "fire-horse", "year of the"], url: "https://nibsnetwork.com/lifestyle/chinese-new-year-2026-year-of-the-fire-horse/" },
    { keywords: ["ichigo ichie", "art of now"], url: "https://nibsnetwork.com/lifestyle/ichigo-ichiethe-art-of-now/" },
    { keywords: ["smell fear", "nature detects"], url: "https://nibsnetwork.com/lifestyle/animals-that-can-smell-fear-how-nature-detects-emotions/" },
    { keywords: ["fake matcha"], url: "https://nibsnetwork.com/lifestyle/5-ways-to-identify-fake-matcha/" },
    { keywords: ["heath ledger", "ledger anniversary", "beyond the joker"], url: "https://nibsnetwork.com/lifestyle/remembering-heath-ledger-on-his-18th-death-anniversary/" },

    // ===== TRAVEL =====
    { keywords: ["winter getaway", "warm winter"], url: "https://nibsnetwork.com/travel/6-safest-warm-winter-getaways-2026-nyc-toronto-escapes/" },
    { keywords: ["mauro morandi", "lived alone", "stillness"], url: "https://nibsnetwork.com/travel/mauro-morandi-the-man-who-lived-alone-on-an-island-for-over-30-years/" },
    { keywords: ["gen-z", "ai plan trips", "ai to plan", "ai hack travel"], url: "https://nibsnetwork.com/travel/how-gen-z-is-using-ai-to-hack-travel-in-2026/" },
    { keywords: ["blood moon", "red moon", "march 3"], url: "https://nibsnetwork.com/travel/chasing-the-red-moon-your-guide-to-the-march-3-2026-blood-moon/" },
    { keywords: ["sustainable tourism", "hotel 2026"], url: "https://nibsnetwork.com/travel/why-sustainable-tourism-is-essential-for-hotels-in-2026/" },
    { keywords: ["greenland", "really green", "viking myth"], url: "https://nibsnetwork.com/travel/is-greenland-really-green-the-viking-myth-exposed/" },
    { keywords: ["traveler's bloat", "bloat"], url: "https://nibsnetwork.com/travel/travelers-bloateverything-you-need-to-know/" },
    { keywords: ["traveling to the u.s", "visa woe", "politics"], url: "https://nibsnetwork.com/travel/why-traveling-to-the-us-feels-harder-in-2026-and-what-politics-has-to-do-with-it/" },
    { keywords: ["sleep on a plane", "sleep comfortably"], url: "https://nibsnetwork.com/travel/8-tips-for-how-to-sleep-comfortably-on-a-plane/" },
    { keywords: ["eco-traveler", "green sheen", "greenwashing"], url: "https://nibsnetwork.com/travel/eco-tourism-vs-greenwashinghow-to-spot-the-real-deal/" },
    { keywords: ["world war"], url: "https://nibsnetwork.com/travel/will-there-be-a-world-war-in-2026/" },
    { keywords: ["train travel", "rails are cool"], url: "https://nibsnetwork.com/travel/train-travels-epic-comeback-rails-are-cool-again/" },

    // ===== CUISINE =====
    { keywords: ["soup", "loved soups"], url: "https://nibsnetwork.com/cuisine/20-of-the-worlds-most-loved-soups/" },
    { keywords: ["italy unesco", "national cuisine"], url: "https://nibsnetwork.com/cuisine/italy-becomes-the-first-country-to-receive-unesco-recognition-for-its-national-cuisine/" },
    { keywords: ["omakase", "vr beverage"], url: "https://nibsnetwork.com/cuisine/inside-chef-kazushige-suzukis-omakase-vr-beverage-journey/" },
    { keywords: ["mediterranean diet", "green mediterranean"], url: "https://nibsnetwork.com/cuisine/how-the-green-mediterranean-diet-works/" },
    { keywords: ["thermogenic", "metabolism", "spices"], url: "https://nibsnetwork.com/cuisine/7-heat-generating-spices-that-boosts-your-metabolism/" },
    { keywords: ["comfort food", "american comfort", "unhealthy to health"], url: "https://nibsnetwork.com/cuisine/classic-american-comfort-foods-ranked-from-unhealthiest-to-healthiest/" },
    { keywords: ["guava-pistachio", "tiramisu", "dessert"], url: "https://nibsnetwork.com/cuisine/the-tropical-renaissance-why-guava-pistachio-tiramisu-is-taking-over/" },
    { keywords: ["citrus salad", "citrus season", "bowl of citrus"], url: "https://nibsnetwork.com/cuisine/a-fresh-take-in-winter-citrus-salad/" },
    { keywords: ["fricy", "swicy", "sweet-spicy"], url: "https://nibsnetwork.com/cuisine/fricy-and-swicy-revolution-why-sweet-spicy-and-fruit-heat-are-dominating-2026-menus/" },
    { keywords: ["gut-health", "cabbage", "pulses", "superfood"], url: "https://nibsnetwork.com/cuisine/the-gut-health-revolutionwhy-cabbage-and-pulses-are-the-new-superfoods/" },
    { keywords: ["seafood", "heart and brain"], url: "https://nibsnetwork.com/cuisine/15-healthiest-seafood-options-for-heart-and-brain-health/" },
    { keywords: ["blue zone", "mediterranean longevity"], url: "https://nibsnetwork.com/cuisine/mediterranean-diets/" },

    // ===== SPORTS =====
    { keywords: ["rafael nadal", "alcaraz"], url: "https://nibsnetwork.com/sports/rafael-nadals-viral-ao-2026-return-cheering-alcaraz-to-glory/" },
    { keywords: ["knicks", "lakers vs knicks", "madison square"], url: "https://nibsnetwork.com/sports/lakers-vs-knicks-anunobys-25-points-fuel-6th-straight-win-for-nyk/" },
    { keywords: ["sean mannion", "eagles"], url: "https://nibsnetwork.com/sports/why-sean-mannions-hiring-matters-for-the-eagles/" },
    { keywords: ["todd monken", "cleveland browns"], url: "https://nibsnetwork.com/sports/todd-monken-to-be-the-new-head-coach-of-cleveland-browns/" },
    { keywords: ["sports simulation", "ea fc", "nhl 26"], url: "https://nibsnetwork.com/sports/most-realistic-sports-simulation-games-of-2026/" },
    { keywords: ["harrison bader", "sf giants", "san francisco giants"], url: "https://nibsnetwork.com/sports/san-francisco-giants-bolster-defense-with-harrison-bader-signing/" },
    { keywords: ["john brodie", "49ers legend"], url: "https://nibsnetwork.com/sports/john-brodie-49ers-legend-and-1970-nfl-mvp-dies-at-90/" },
    { keywords: ["f1 circuit", "formula 1 enthusiast"], url: "https://nibsnetwork.com/sports/best-circuits-for-formula-1-enthusiasts-to-visit-in-2026/" },
    { keywords: ["lakers vs clippers", "kawhi leonard", "lakers stumble"], url: "https://nibsnetwork.com/sports/lakers-vs-clippers-heartbreaker-kawhi-leonard-shines-as-lakers-stumble/" },
    { keywords: ["f1 2026", "f1 cars", "formula one"], url: "https://nibsnetwork.com/sports/f1-2026-cars-new-models-signal-a-major-shift-in-formula-one/" },
    { keywords: ["jimmy butler", "warriors", "knee injury"], url: "https://nibsnetwork.com/sports/jimmy-butlers-shocking-knee-injury-warriors-face-uncertain-road-ahead/" },
    { keywords: ["arbeloa", "copa del rey", "real madrid"], url: "https://nibsnetwork.com/sports/alvaro-arbeloa-under-fire-after-real-madrids-shock-copa-del-rey-exit/" },
    { keywords: ["underdog revolution", "niche sports"], url: "https://nibsnetwork.com/sports/the-underdog-revolution-why-niche-sports-are-winning/" },
    { keywords: ["tiktok fifa", "fifa partnership"], url: "https://nibsnetwork.com/sports/tiktok-x-fifa-2026/" },
    { keywords: ["ticket request", "500 million", "world cup ticket"], url: "https://nibsnetwork.com/sports/world-cup-2026-ticket-frenzy/" },
    { keywords: ["key sports event", "sports event 2026", "epic sports"], url: "https://nibsnetwork.com/sports/key-sports-events-to-watch-in-2026/" },
];

function mapPostsToBlog() {
    console.log("=== Mapping Instagram Posts to VERIFIED Blog Articles ===\n");

    const content = fs.readFileSync(CONSTANTS_PATH, 'utf-8');
    const match = content.match(/export const INSTAGRAM_POSTS = (\[[\s\S]*?\]);/);

    if (!match) {
        console.error("Could not parse constants.js");
        return;
    }

    let posts = JSON.parse(match[1]);
    console.log(`Processing ${posts.length} posts...\n`);

    // Clear existing blogUrl
    posts.forEach(p => delete p.blogUrl);

    let mappedCount = 0;
    let mappedPosts = [];
    let unmappedPosts = [];

    for (const post of posts) {
        const title = post.title.toLowerCase();
        let matched = false;

        for (const article of BLOG_ARTICLES) {
            if (article.keywords.some(kw => title.includes(kw.toLowerCase()))) {
                post.blogUrl = article.url;
                mappedCount++;
                matched = true;
                mappedPosts.push({ title: post.title, url: article.url });
                break;
            }
        }

        if (!matched) {
            unmappedPosts.push(post.title);
        }
    }

    // Save
    const fileContent = `export const INSTAGRAM_POSTS = ${JSON.stringify(posts, null, 2)};\n`;
    fs.writeFileSync(CONSTANTS_PATH, fileContent);

    console.log("=== MAPPED POSTS ===");
    mappedPosts.forEach((p, i) => {
        console.log(`${i + 1}. ${p.title.substring(0, 50)}...`);
        console.log(`   -> ${p.url}\n`);
    });

    console.log(`\n=== SUMMARY ===`);
    console.log(`✓ Mapped: ${mappedCount}/${posts.length} posts to blog articles`);
    console.log(`✗ Unmapped: ${unmappedPosts.length} posts (will link to Instagram)\n`);

    if (unmappedPosts.length > 0) {
        console.log("=== UNMAPPED POSTS (need manual mapping) ===");
        unmappedPosts.forEach((t, i) => console.log(`${i + 1}. ${t}`));
    }
}

mapPostsToBlog();
