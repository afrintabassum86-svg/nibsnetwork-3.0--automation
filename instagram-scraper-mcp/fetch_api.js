import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const GRAPH_URL = 'https://graph.facebook.com/v19.0'; // or latest version

async function fetchJson(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
            throw new Error(`API Error: ${data.error.message}`);
        }
        return data;
    } catch (e) {
        throw new Error(`Request failed: ${e.message}`);
    }
}

async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                    .on('error', reject)
                    .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Request Failed With a Status Code: ${res.statusCode}`));
            }
        });
    });
}

async function run() {
    console.log("Starting Graph API Fetch...");

    if (!ACCESS_TOKEN) {
        console.error("Error: INSTAGRAM_ACCESS_TOKEN not found in .env");
        return;
    }

    try {
        // 1. Get User's Pages and connected Instagram Accounts
        console.log("Fetching connected Instagram ID...");
        // Request username field
        const pagesUrl = `${GRAPH_URL}/me/accounts?fields=name,instagram_business_account{id,username}&access_token=${ACCESS_TOKEN}`;
        const pagesData = await fetchJson(pagesUrl);

        let instagramId = null;
        let foundUsername = "";

        // Find the first page with an Instagram Business Account
        for (const page of pagesData.data || []) {
            if (page.instagram_business_account) {
                instagramId = page.instagram_business_account.id;
                foundUsername = page.instagram_business_account.username;
                console.log(`Found Instagram ID: ${instagramId} (Username: @${foundUsername})`);

                if (foundUsername.toLowerCase() === 'nibsnetwork') {
                    break;
                }
            }
        }

        if (!instagramId) {
            console.error("No linked Instagram Business Account found.");
            return;
        }

        if (foundUsername.toLowerCase() !== 'nibsnetwork') {
            console.warn(`WARNING: The token is linked to @${foundUsername}, NOT @nibsnetwork.`);
            console.warn("If you need @nibsnetwork, you must generate a token for the Facebook Page linked to that specific Instagram account.");
            // We Continue anyway, just to show what we found, but user needs to know.
        }

        if (!instagramId) {
            console.error("No linked Instagram Business Account found via this token.");
            console.log("Ensure your Instagram account is switched to Business/Creator and linked to a Facebook Page.");
            return;
        }

        // 2. Fetch Media from that Instagram Account
        console.log("Fetching Media...");
        // Fields: id, caption, media_type, media_url, permalink, timestamp, thumbnail_url
        const mediaUrl = `${GRAPH_URL}/${instagramId}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=50&access_token=${ACCESS_TOKEN}`;

        const mediaData = await fetchJson(mediaUrl);
        const remotePosts = mediaData.data || [];

        console.log(`Found ${remotePosts.length} posts.`);

        // 3. Process and Download
        const publicPostsDir = path.resolve(__dirname, '../public/posts');
        if (!fs.existsSync(publicPostsDir)) fs.mkdirSync(publicPostsDir, { recursive: true });

        const processedPosts = [];

        for (const post of remotePosts) {
            // We only want IMAGE or CAROUSEL_ALBUM (use first image) or VIDEO (use thumbnail)
            let imageUrl = post.media_url;

            if (post.media_type === 'VIDEO') {
                imageUrl = post.thumbnail_url || post.media_url; // Some videos don't give thumbnail in basic permissions, but usually do
            }

            if (!imageUrl) {
                console.log(`Skipping post ${post.id}: No image URL available.`);
                continue;
            }

            const filename = `ig-${post.id}.jpg`;
            const filePath = path.join(publicPostsDir, filename);
            const localUrl = `/posts/${filename}`;

            try {
                await downloadImage(imageUrl, filePath);
                console.log(`Saved ${filename}`);
            } catch (err) {
                console.error(`Failed to download ${post.id}`, err.message);
                continue; // Skip if download fails
            }

            // Create formatted object
            const caption = post.caption || "Instagram Post";
            const title = caption.length > 60 ? caption.substring(0, 60) + "..." : caption;

            processedPosts.push({
                id: `ig-${post.id}`,
                title: title.replace(/['"]/g, ""),
                url: post.permalink || `https://www.instagram.com/p/${post.id}/`,
                image: localUrl,
                type: post.media_type.toLowerCase()
            });
        }

        // 4. Update constants.js
        if (processedPosts.length > 0) {
            const fileContent = `export const INSTAGRAM_POSTS = ${JSON.stringify(processedPosts, null, 2)};\n`;
            const outputPath = path.resolve(__dirname, '../src/constants.js');
            fs.writeFileSync(outputPath, fileContent);
            console.log(`SUCCESS: Updated constants.js with ${processedPosts.length} posts.`);
        } else {
            console.log("No valid posts processed.");
        }

    } catch (error) {
        console.error("API Error:", error.message);
    }
}

run();
