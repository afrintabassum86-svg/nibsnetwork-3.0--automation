
const APP_ID = '1220620283606058';
const APP_SECRET = 'c3e438aa25db96206c194cde1f59532d';
const SHORT_TOKEN = 'EAARWJc5o9CoBQra189ZC3qDAy41LV0Iv3ZAD4NPGL2P90ZCK6eIdmYWQn0oV47K8IERKX5t2SFSUTryWSaf58MwR77UxdujKg49q5Y56mDs9XGeB508aXBJ1oEyTXrXnDb79mkPDu4ZCteQtZAp1cOcpha7RhtROc4R7OOIHva0DoCZBT1NC1JhqyZAWbrlustyzVeAzTyAP72woASDD18ZAXIzn6ZCVnD4IwYQZDZD';

async function setup() {
    try {
        console.log("1. Exchanging Short Token for Long-Lived Token...");
        const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;

        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) {
            console.error("❌ Error exchanging token:", exchangeData.error.message);
            return;
        }

        const LONG_TOKEN = exchangeData.access_token;
        console.log("✅ Long-Lived Token Obtained!");

        console.log("\n2. Fetching Connected Pages & Instagram Accounts...");
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=name,id,instagram_business_account{id,username}&access_token=${LONG_TOKEN}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (pagesData.error) {
            console.error("❌ Error fetching pages:", pagesData.error.message);
            return;
        }

        if (!pagesData.data || pagesData.data.length === 0) {
            console.error("❌ No Facebook Pages found! Ensure you selected the Page in the popup.");
            return;
        }

        let found = false;
        console.log(`Found ${pagesData.data.length} Pages.`);

        for (const page of pagesData.data) {
            console.log(`\n--- Page: ${page.name} ---`);
            if (page.instagram_business_account) {
                const igId = page.instagram_business_account.id;
                const igUser = page.instagram_business_account.username;
                console.log(`✅ FOUND Instagram ID: ${igId} (@${igUser})`);

                console.log("\n🚀 FINAL CONFIGURATION FOR .env:");
                console.log("-------------------");
                console.log(`INSTAGRAM_ACCESS_TOKEN=${LONG_TOKEN}`);
                console.log(`INSTAGRAM_BUSINESS_ACCOUNT_ID=${igId}`);
                console.log("-------------------");
                found = true;
            } else {
                console.log("❌ No Instagram Business Account linked to this page.");
            }
        }

        if (!found) {
            console.error("\n❌ Could not find any connected Instagram Business Account.");
            console.error("Resolution: Link your Instagram to the FB Page first.");
        }

    } catch (e) {
        console.error("Setup Error:", e.message);
    }
}

setup();
