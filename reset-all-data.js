import pool from './lib/db.js';

async function resetAll() {
    try {
        await pool.query('TRUNCATE TABLE instagram_posts, blog_articles RESTART IDENTITY');
        console.log("ALL DATA CLEARED (Blog + Instagram + Mappings)");
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

resetAll();
