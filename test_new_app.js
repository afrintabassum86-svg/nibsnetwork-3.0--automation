const NEW_APP_ID = '1220620283606058';
const NEW_APP_SECRET = 'c3e438aa25db96206c194cde1f59532d';

async function checkApp() {
    console.log("🔍 Checking App Connection for:", NEW_APP_ID);

    try {
        // Test to see if the app exists and secret is correct by getting basic app info
        const url = `https://graph.facebook.com/${NEW_APP_ID}?access_token=${NEW_APP_ID}|${NEW_APP_SECRET}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.log("❌ App Check Failed:", data.error.message);
        } else {
            console.log("✅ App Details Found:");
            console.log("   Name:", data.name);
            console.log("   ID:", data.id);
            console.log("\n⚠️ IMPORTANT: To get the Instagram ID and Token for 'khaikhai bagli',");
            console.log("you MUST first generate a SHORT-LIVED token for this specific account.");
            console.log("Please go to the Graph API Explorer and get a user token for this App ID.");
        }
    } catch (e) {
        console.log("❌ Request Failed:", e.message);
    }
}

checkApp();
