
const APP_ID = '1220620283606058';
const APP_SECRET = 'c3e438aa25db96206c194cde1f59532d';
const SHORT_TOKEN = 'EAARWJc5o9CoBQuUZAcZCLywxX0ExA8XzhIgikpBTs5hUOa9kEw814XwzeGZAf8Bp5YQY1hwQ688nKhbqfDnqG0SAvC1ucokD1KFAuZCwQiKAjoEpt4twntY8Lkve1bi4PHXAG1iK53QdHmHBgVUOXB9XJd2mrG2oKIpGyuxZBMqdMTtjtbv9gXCzYZA52s';

import fs from 'fs';

async function exchangeToFile() {
    try {
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;
        const res = await fetch(exchangeUrl);
        const data = await res.json();

        if (data.error) {
            fs.writeFileSync('exchange_token_new.txt', 'ERROR: ' + JSON.stringify(data.error));
            return;
        }

        fs.writeFileSync('exchange_token_new.txt', data.access_token);
        console.log('Token written to exchange_token_new.txt');
    } catch (e) {
        console.log('Error:', e.message);
    }
}

exchangeToFile();
