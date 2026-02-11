import fetch from 'node-fetch';
import fs from 'fs';

const APP_ID = '1130634225301138';
const APP_SECRET = '6013661eb1808620800b46244498308e';
const SHORT_TOKEN = 'EAAMhsf7N0N8BQhQqwtoxsEq96oiCBNpvmMDYrhmnknnemZC5MZAuOhHJSFy5C4VnAIC0XsyJkjm0WMEZASWWRAW5r6ZAYlNifpdaUdpeKZBBZBEP3vRbkLz8Ag3PjUkeYGmzFdpPcdgwpmPI2z3AOh44va396d1lQSlQOAnszu0dyapaDMREjZAIunG1GfT3lGiqy0tmP2HfnCpANURswOZAHCkZD';

async function exchange() {
    try {
        const url = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.access_token) {
            console.log('---TOKEN_START---');
            console.log(data.access_token);
            console.log('---TOKEN_END---');
            fs.writeFileSync('hayret_token.txt', data.access_token);
        } else {
            console.error('Error:', data);
        }
    } catch (e) {
        console.error(e);
    }
}
exchange();
