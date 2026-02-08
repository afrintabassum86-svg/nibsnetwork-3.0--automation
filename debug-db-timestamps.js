import { query } from './lib/db.js';

async function checkData() {
    try {
        const res = await query('SELECT count(*) as total, count(timestamp) as with_time, min(timestamp) as earliest, max(timestamp) as latest FROM instagram_posts');
        console.log('Stats:', res.rows[0]);

        const sample = await query('SELECT id, timestamp FROM instagram_posts LIMIT 5');
        console.log('Sample:', sample.rows);
    } catch (e) {
        console.error(e);
    }
}

checkData();
