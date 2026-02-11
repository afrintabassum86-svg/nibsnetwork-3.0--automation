import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const token = process.env.INSTAGRAM_ACCESS_TOKEN;
const id = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

async function testToken() {
    console.log("Testing Instagram Token...");
    console.log("ID:", id);

    try {
        const url = `https://graph.facebook.com/v19.0/${id}?fields=username,name&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.log("❌ Token Error:", data.error.message);
        } else {
            console.log("✅ Token is WORKING!");
            console.log("Name:", data.name);
            console.log("Username: @", data.username);
        }
    } catch (e) {
        console.log("❌ Request Failed:", e.message);
    }
}

testToken();
