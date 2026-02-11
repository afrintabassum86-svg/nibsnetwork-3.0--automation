import pool, { query, closePool } from './lib/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function clearData() {
    console.log("🧹 Starting data cleanup...");

    try {
        // 1. Get all table names
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        const tables = res.rows.map(r => r.table_name);
        console.log("Found tables:", tables);

        // 2. Truncate all tables
        if (tables.length > 0) {
            const truncateQuery = `TRUNCATE TABLE ${tables.join(', ')} CASCADE;`;
            console.log("Executing:", truncateQuery);
            await query(truncateQuery);
            console.log("✅ All database tables cleared.");
        } else {
            console.log("ℹ️ No tables found in public schema.");
        }

        // 3. Reset constants.js
        const constantsPath = path.resolve(__dirname, './src/constants.js');
        if (fs.existsSync(constantsPath)) {
            const emptyConstants = "export const INSTAGRAM_POSTS = [];\nexport const BLOG_POSTS = [];\nexport const MAPPINGS = {};\n";
            fs.writeFileSync(constantsPath, emptyConstants);
            console.log("✅ src/constants.js has been reset.");
        }

    } catch (err) {
        console.error("❌ Cleanup failed:", err.message);
    } finally {
        await closePool();
        process.exit();
    }
}

clearData();
