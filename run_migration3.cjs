const { Client } = require('pg');
const c = new Client({
  host: 'db.qcvrmbqyawmgezifunkh.supabase.co',
  port: 5432, user: 'postgres', password: 'Rtydfgxc5202@',
  database: 'postgres', ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

(async () => {
  await c.connect();
  try {
    await c.query(`ALTER TABLE profiles ADD COLUMN redirect_url TEXT`);
    console.log('redirect_url column added to profiles');
  } catch (e) {
    console.log('Column may already exist:', e.message);
  }
  console.log('Done!');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
