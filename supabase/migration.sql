-- =============================================
-- SaaS Privacy — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES (linked to Supabase Auth user id)
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL,  -- Supabase Auth user UUID
  username VARCHAR(64) NOT NULL UNIQUE,
  "displayName" VARCHAR(255) NOT NULL,
  bio TEXT,
  "profilePicUrl" TEXT,
  "bannerUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "totalSubscribers" INTEGER NOT NULL DEFAULT 0,
  "totalPosts" INTEGER NOT NULL DEFAULT 0,
  "totalMedia" INTEGER NOT NULL DEFAULT 0,
  "totalExclusive" INTEGER NOT NULL DEFAULT 0,
  "totalLikes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS profiles_userId_idx ON profiles("userId");
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- =============================================
-- 2. SUBSCRIPTION PLANS
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  "profileId" INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "priceInCents" INTEGER NOT NULL,
  "billingCycle" VARCHAR(20) NOT NULL DEFAULT 'monthly',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS plans_profileId_idx ON subscription_plans("profileId");

-- =============================================
-- 3. GATEWAY CONFIGS (per-user payment settings)
-- =============================================
CREATE TABLE IF NOT EXISTS gateway_configs (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL UNIQUE,  -- Supabase Auth user UUID
  gateway VARCHAR(20) NOT NULL DEFAULT 'pushinpay',
  pushinpay_token TEXT,
  blackout_public_key TEXT,
  blackout_secret_key TEXT,
  novaplex_client_id TEXT,
  novaplex_client_secret TEXT,
  redirect_url TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS gw_userId_idx ON gateway_configs("userId");

-- =============================================
-- 4. TRANSACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  "profileId" INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  "subscriberId" INTEGER DEFAULT 0,
  "amountInCents" INTEGER NOT NULL,
  "platformFeeInCents" INTEGER NOT NULL DEFAULT 0,
  "creatorEarningsInCents" INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "paymentGateway" VARCHAR(30),
  "externalTransactionId" VARCHAR(255),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- PROFILES: Public read, owner write
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profiles" ON profiles FOR INSERT WITH CHECK (auth.uid()::uuid = "userId");
CREATE POLICY "Users can update own profiles" ON profiles FOR UPDATE USING (auth.uid()::uuid = "userId");
CREATE POLICY "Users can delete own profiles" ON profiles FOR DELETE USING (auth.uid()::uuid = "userId");

-- SUBSCRIPTION PLANS: Public read, profile owner write
CREATE POLICY "Anyone can read plans" ON subscription_plans FOR SELECT USING (true);
CREATE POLICY "Profile owners can manage plans" ON subscription_plans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = "profileId" AND "userId" = auth.uid()::uuid)
);
CREATE POLICY "Profile owners can update plans" ON subscription_plans FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = "profileId" AND "userId" = auth.uid()::uuid)
);
CREATE POLICY "Profile owners can delete plans" ON subscription_plans FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = "profileId" AND "userId" = auth.uid()::uuid)
);

-- GATEWAY CONFIGS: Only owner can read/write
CREATE POLICY "Users can read own gateway config" ON gateway_configs FOR SELECT USING (auth.uid()::uuid = "userId");
CREATE POLICY "Users can insert own gateway config" ON gateway_configs FOR INSERT WITH CHECK (auth.uid()::uuid = "userId");
CREATE POLICY "Users can update own gateway config" ON gateway_configs FOR UPDATE USING (auth.uid()::uuid = "userId");

-- TRANSACTIONS: Owner can read
CREATE POLICY "Profile owners can read transactions" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = "profileId" AND "userId" = auth.uid()::uuid)
);
-- Service role can insert (from API)
CREATE POLICY "Service role can insert transactions" ON transactions FOR INSERT WITH CHECK (true);
