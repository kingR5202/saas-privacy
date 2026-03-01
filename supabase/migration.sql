-- Supabase PostgreSQL Migration
-- Creates all tables for the SaaS Privacy MVP
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/qcvrmbqyawmgezifunkh/sql)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Subscription Plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id SERIAL PRIMARY KEY,
  "profileId" INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "priceInCents" INTEGER NOT NULL,
  "billingCycle" VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK ("billingCycle" IN ('monthly', 'quarterly', 'yearly', 'lifetime')),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscription_plans_profileId_idx ON subscription_plans("profileId");

-- Content table
CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
  "profileId" INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  "contentType" VARCHAR(10) NOT NULL CHECK ("contentType" IN ('photo', 'video', 'post')),
  "mediaUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "isExclusive" BOOLEAN NOT NULL DEFAULT FALSE,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS content_profileId_idx ON content("profileId");

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  "subscriberId" INTEGER NOT NULL REFERENCES users(id),
  "profileId" INTEGER NOT NULL REFERENCES profiles(id),
  "planId" INTEGER NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  "externalSubscriptionId" VARCHAR(255),
  "paymentGateway" VARCHAR(20) CHECK ("paymentGateway" IN ('novaplex', 'blackout', 'pushinpay')),
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate" TIMESTAMPTZ,
  "renewalDate" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_subscriberId_idx ON subscriptions("subscriberId");
CREATE INDEX IF NOT EXISTS subscriptions_profileId_idx ON subscriptions("profileId");

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  "subscriptionId" INTEGER REFERENCES subscriptions(id),
  "profileId" INTEGER NOT NULL REFERENCES profiles(id),
  "subscriberId" INTEGER NOT NULL,
  "amountInCents" INTEGER NOT NULL,
  "platformFeeInCents" INTEGER NOT NULL,
  "creatorEarningsInCents" INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  "paymentGateway" VARCHAR(20) NOT NULL CHECK ("paymentGateway" IN ('novaplex', 'blackout', 'pushinpay')),
  "externalTransactionId" VARCHAR(255),
  "webhookPayload" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS transactions_profileId_idx ON transactions("profileId");
CREATE INDEX IF NOT EXISTS transactions_subscriberId_idx ON transactions("subscriberId");
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  "profileId" INTEGER NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  "balanceInCents" INTEGER NOT NULL DEFAULT 0,
  "totalEarningsInCents" INTEGER NOT NULL DEFAULT 0,
  "totalWithdrawnInCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wallets_profileId_idx ON wallets("profileId");

-- Payment Gateway Credentials table
CREATE TABLE IF NOT EXISTS payment_gateway_credentials (
  id SERIAL PRIMARY KEY,
  gateway VARCHAR(20) NOT NULL UNIQUE CHECK (gateway IN ('novaplex', 'blackout', 'pushinpay')),
  "apiKey" TEXT NOT NULL,
  "apiSecret" TEXT,
  "webhookSecret" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_credentials ENABLE ROW LEVEL SECURITY;

-- Allow service_role to bypass RLS (our backend uses service_role key)
-- Public read policies for profiles, content, and plans (for the public profile page)
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public content is viewable by everyone" ON content FOR SELECT USING (true);
CREATE POLICY "Public plans are viewable by everyone" ON subscription_plans FOR SELECT USING (true);

-- Service role has full access (managed by the key, not RLS)
-- For anon key access to public data:
CREATE POLICY "Transactions viewable by service role" ON transactions FOR ALL USING (true);
CREATE POLICY "Users managed by service role" ON users FOR ALL USING (true);
CREATE POLICY "Subscriptions managed by service role" ON subscriptions FOR ALL USING (true);
CREATE POLICY "Wallets managed by service role" ON wallets FOR ALL USING (true);
CREATE POLICY "Payment credentials managed by service role" ON payment_gateway_credentials FOR ALL USING (true);
