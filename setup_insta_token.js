
const APP_ID = '881473297961183';
const APP_SECRET = 'af279679cb26f14353a01db6d214dfe4';
const SHORT_TOKEN = 'EAAMhsf7N0N8BQlesOAZAGF2GZBpSkDIjZAbbY5hCDZCE7dEKwor0tJd5mzSqInr5MXLS3IiufNFhK1nqoLKFZAEr4bvgBWAWZArrCHcyQG2CTnqBUvYSuGqeQIRkKZCP68j8tMfJktq8h9xwZBfEP8QyXZANitDMKkKWnXqEMocfcwtvQADIKyGyMte98wdGT509AxT8IgT5t077zt5bH2R0aaOaFid8Ub8JpBtctrR12ZBJ5TMH8i';

async function setup() {
    try {
        console.log("1. Exchanging Short Token for Long-Lived Token...");
        const exchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;

        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) {
            console.error("Error exchanging token:", exchangeData.error);
            return;
        }

        const LONG_TOKEN = exchangeData.access_token;
        console.log("✓ Long-Lived Token Obtained!");
        // console.log("Token:", LONG_TOKEN); // Don't log entirely for security

        console.log("\n2. Fetching Connected Pages...");
        const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${LONG_TOKEN}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            console.error("❌ No Facebook Pages found! Ensure you have a Page and it is linked.");
            return;
        }

        let instaBusinessId = null;
        console.log(`Found ${pagesData.data.length} Pages.`);

        for (const page of pagesData.data) {
            console.log(`  Checking Page: ${page.name} (ID: ${page.id})...`);

            // Get Instagram Business Account
            const instaUrl = `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${LONG_TOKEN}`;
            const instaRes = await fetch(instaUrl);
            const instaData = await instaRes.json();

            if (instaData.instagram_business_account) {
                instaBusinessId = instaData.instagram_business_account.id;
                console.log(`  ✅ FOUND Instagram Business Account ID: ${instaBusinessId}`);
                break; // Use the first one found
            } else {
                console.log("  ❌ No Instagram Business Account linked to this page.");
            }
        }

        if (instaBusinessId) {
            console.log("\n--- SUCCESS ---");
            console.log("IG_ACCESS_TOKEN=" + LONG_TOKEN);
            console.log("IG_BUSINESS_ID=" + instaBusinessId);
            console.log("----------------");
            console.log("Please save these to your .env file!");
        } else {
            console.error("\n❌ Could not find any connected Instagram Business Account.");
            console.error("Please make sure your Instagram is switched to 'Business'/'Creator' and connected to a Facebook Page.");
        }

    } catch (e) {
        console.error("Setup Error:", e);
    }
}

setup();
