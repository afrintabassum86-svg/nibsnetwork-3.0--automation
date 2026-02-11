import fetch from 'node-fetch';
import fs from 'fs';

const APP_ID = '1130634225301138';
const APP_SECRET = '6013661eb1808620800b46244498308e';
const SHORT_TOKEN = 'EAAMhsf7N0N8BQnksVZBG0S4rtpwZCT6eslrvn89cMFroZCW2MAiplUv3sZCPZAq3Ek77okKbhNLPxuq1gVbbP0qqljPPaOtkA025SSGZBbaz9lPFgd13RZCBWJYZBhSxhhE6UOazhjOViEs8kZCZApSlqInI7AeEYGzYNYlYpfw6FCg3l5MFpj7UoM4WjNl6Nh1OgZB7otXJ6QEnbiJiC2j';

async function exchange() {
    try {
        const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.access_token) {
            console.log('---TOKEN_START---');
            console.log(data.access_token);
            console.log('---TOKEN_END---');
            fs.writeFileSync('hayret_token_long.txt', data.access_token);
        } else {
            console.error('Error:', data);
            // If exchange fails, we'll try to use the short token directly as a fallback, 
            // but we'll notify the user.
        }
    } catch (e) {
        console.error(e);
    }
}
exchange();
