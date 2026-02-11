
const APP_ID = '1220620283606058';
const APP_SECRET = 'c3e438aa25db96206c194cde1f59532d';
const SHORT_TOKEN = 'EAARWJc5o9CoBQra189ZC3qDAy41LV0Iv3ZAD4NPGL2P90ZCK6eIdmYWQn0oV47K8IERKX5t2SFSUTryWSaf58MwR77UxdujKg49q5Y56mDs9XGeB508aXBJ1oEyTXrXnDb79mkPDu4ZCteQtZAp1cOcpha7RhtROc4R7OOIHva0DoCZBT1NC1JhqyZAWbrlustyzVeAzTyAP72woASDD18ZAXIzn6ZCVnD4IwYQZDZD';

async function exchangeOnly() {
    try {
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_TOKEN}`;
        const res = await fetch(exchangeUrl);
        const data = await res.json();

        if (data.error) {
            console.log('--- ERROR ---');
            console.log(JSON.stringify(data.error, null, 2));
            return;
        }

        console.log('--- SUCCESS ---');
        console.log('LONG_LIVED_TOKEN_START');
        console.log(data.access_token);
        console.log('LONG_LIVED_TOKEN_END');
    } catch (e) {
        console.log('Error:', e.message);
    }
}

exchangeOnly();
