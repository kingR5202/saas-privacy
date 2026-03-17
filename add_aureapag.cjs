const { Client } = require('pg');
const conn = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!conn) {
    throw new Error('Missing DATABASE_URL (or SUPABASE_DB_URL) environment variable.');
}
const c = new Client({
    connectionString: conn,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
});

(async () => {
    await c.connect();
    const cols = [
        'aureapag_api_token',
        'aureapag_offer_hash',
        'aureapag_product_hash'
    ];
    for (const col of cols) {
        try {
            await c.query(`ALTER TABLE gateway_configs ADD COLUMN ${col} TEXT`);
            console.log(`Added ${col}`);
        } catch (e) { console.log(`${col} exists`); }
    }
    console.log('Done!');
    await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
