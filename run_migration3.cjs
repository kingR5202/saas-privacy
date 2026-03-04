const { Client } = require('pg');
const c = new Client({
  host: 'db.qcvrmbqyawmgezifunkh.supabase.co',
  port: 5432, user: 'postgres', password: 'Rtydfgxc5202@',
  database: 'postgres', ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

(async () => {
  await c.connect();
  const cols = [
    // VizzionPay
    'vizzionpay_public_key',
    'vizzionpay_secret_key',
    // AlphaCash
    'alphacash_public_key',
    'alphacash_secret_key',
    // BuckPay
    'buckpay_token',
    'buckpay_user_agent',
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
