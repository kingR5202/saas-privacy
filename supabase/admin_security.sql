-- ============================================================
-- Admin Security Tables
-- Run against Supabase SQL Editor or via migration
-- ============================================================

-- Persistent brute-force tracking for admin login attempts.
-- Used by api/admin.ts and api/admin-totp.ts to block IPs
-- after 3 failures for 24 hours.

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id          BIGSERIAL    PRIMARY KEY,
  ip_address  TEXT         NOT NULL,
  user_email  TEXT,
  success     BOOLEAN      DEFAULT FALSE,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_attempts_ip_time
  ON admin_login_attempts (ip_address, attempted_at);

-- RLS: only service_role can access this table
ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- Cleanup policy: auto-delete entries older than 7 days (optional cron)
-- You can schedule this via Supabase Edge Functions or pg_cron:
--   DELETE FROM admin_login_attempts WHERE attempted_at < NOW() - INTERVAL '7 days';
