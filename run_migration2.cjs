const { Client } = require('pg');
const c = new Client({
  host: 'db.qcvrmbqyawmgezifunkh.supabase.co',
  port: 5432, user: 'postgres', password: 'Rtydfgxc5202@',
  database: 'postgres', ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000
});
(async () => {
  await c.connect();
  console.log('Connected!');
  const cmds = [
    "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme VARCHAR(10) NOT NULL DEFAULT 'dark'",
    'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "totalMedia" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "totalExclusive" INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "totalLikes" INTEGER NOT NULL DEFAULT 0',
    'CREATE TABLE IF NOT EXISTS posts (id SERIAL PRIMARY KEY, "profileId" INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE, "imageUrl" TEXT, "videoUrl" TEXT, caption TEXT, "isLocked" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW())',
    'ALTER TABLE posts ENABLE ROW LEVEL SECURITY',
  ];
  for (const cmd of cmds) {
    try { await c.query(cmd); console.log('OK:', cmd.substring(0, 70)); }
    catch (e) { console.log('WARN:', e.message.substring(0, 100)); }
  }
  // Create policies safely
  const policies = [
    { name: 'Anyone can read posts', sql: 'CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true)' },
    { name: 'Owners insert posts', sql: `CREATE POLICY "Owners insert posts" ON posts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = "profileId" AND "userId" = auth.uid()))` },
    { name: 'Owners delete posts', sql: `CREATE POLICY "Owners delete posts" ON posts FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = "profileId" AND "userId" = auth.uid()))` },
  ];
  for (const p of policies) {
    try { await c.query(p.sql); console.log('POLICY OK:', p.name); }
    catch (e) { console.log('POLICY SKIP:', p.name, '-', e.message.substring(0, 60)); }
  }
  console.log('ALL DONE');
  await c.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
