import fetch from 'node-fetch';

const APP_ID = '1130634225301138';
const APP_SECRET = '6013661eb1808620800b46244498308e';
const SHORT_TOKEN = process.argv[2];

if (!SHORT_TOKEN) {
    console.error('❌ Error: Please provide the short-lived token as an argument.');
    console.log('Usage: node get_new_account_creds.js "YOUR_TOKEN"');
    process.exit(1);
}

async function getNewCreds() {
    try {
        console.log('--- 1. Exchanging for Long-Lived Token ---');
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;
        const exchangeRes = await fetch(exchangeUrl);
        const exchangeData = await exchangeRes.json();

        if (exchangeData.error) throw new Error(exchangeData.error.message);
        const longToken = exchangeData.access_token;
        console.log('✅ Success! Long-Lived Token Generated.');

        console.log('\n--- 2. Finding Instagram Business Account ID ---');
        // Get linked pages
        const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${longToken}`;
        const pagesRes = await fetch(pagesUrl);
        const pagesData = await pagesRes.json();

        if (!pagesData.data || pagesData.data.length === 0) {
            throw new Error('No Facebook Pages found linked to this account.');
        }

        for (const page of pagesData.data) {
            console.log(`Checking Page: ${page.name} (ID: ${page.id})...`);
            const instaUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${longToken}`;
            const instaRes = await fetch(instaUrl);
            const instaData = await instaRes.json();

            if (instaData.instagram_business_account) {
                const igId = instaData.instagram_business_account.id;
                const igUsername = instaData.instagram_business_account.username;
                console.log('\n🌟 FOUND IT!');
                console.log('-----------------------------------------');
                console.log('Instagram Username: ', igUsername);
                console.log('INSTAGRAM_BUSINESS_ACCOUNT_ID: ', igId);
                console.log('INSTAGRAM_ACCESS_TOKEN: ', longToken);
                console.log('-----------------------------------------');
                console.log('\nCopy these values to your Old EC2 .env file.');
                return;
            }
        }

        console.log('❌ Could not find an Instagram Business Account linked to your pages.');
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}

getNewCreds();
