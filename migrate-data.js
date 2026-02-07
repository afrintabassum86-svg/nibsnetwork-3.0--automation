// Migrate data from constants.js to PostgreSQL
import pg from 'pg';
import dotenv from 'dotenv';
import { INSTAGRAM_POSTS } from './src/constants.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log('=== Migrating Data to PostgreSQL ===\n');
    console.log(`Found ${INSTAGRAM_POSTS.length} posts to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const post of INSTAGRAM_POSTS) {
        try {
            await pool.query(`
                INSERT INTO instagram_posts (id, title, url, image, type, blog_url, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    url = EXCLUDED.url,
                    image = EXCLUDED.image,
                    type = EXCLUDED.type,
                    blog_url = EXCLUDED.blog_url,
                    timestamp = EXCLUDED.timestamp,
                    updated_at = NOW()
            `, [
                post.id,
                post.title,
                post.url,
                post.image,
                post.type || 'image',
                post.blogUrl,
                post.timestamp
            ]);
            successCount++;
            process.stdout.write(`\rMigrated: ${successCount}/${INSTAGRAM_POSTS.length}`);
        } catch (error) {
            errorCount++;
            console.error(`\nError migrating ${post.id}:`, error.message);
        }
    }

    console.log('\n\n=== Migration Complete ===');
    console.log(`✓ Successfully migrated: ${successCount} posts`);
    if (errorCount > 0) {
        console.log(`✗ Errors: ${errorCount} posts`);
    }

    // Verify
    const result = await pool.query('SELECT COUNT(*) as count FROM instagram_posts');
    console.log(`\nDatabase now has: ${result.rows[0].count} posts`);

    await pool.end();
}

migrate().catch(console.error);
