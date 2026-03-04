const { Client } = require('pg');
const c = new Client({
  host: 'db.qcvrmbqyawmgezifunkh.supabase.co',
  port: 5432, user: 'postgres', password: 'Rtydfgxc5202@',
  database: 'postgres', ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});

(async () => {
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      profile_id INTEGER,
      gateway VARCHAR(20),
      amount INTEGER NOT NULL DEFAULT 0,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      external_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Table created');
  try { await c.query(`CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id)`); } catch (e) { }
  try { await c.query(`CREATE INDEX IF NOT EXISTS idx_tx_profile ON transactions(profile_id)`); } catch (e) { }
  await c.query(`ALTER TABLE transactions ENABLE ROW LEVEL SECURITY`);
  try { await c.query(`DROP POLICY IF EXISTS tx_all ON transactions`); } catch (e) { }
  await c.query(`CREATE POLICY tx_all ON transactions FOR ALL USING (true) WITH CHECK (true)`);
  console.log('Done!');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
