/**
 * Database access layer using Supabase JS client.
 * Replaces the previous Drizzle/MySQL implementation.
 * All queries use the Supabase REST API via the service_role key.
 */
import { getSupabase } from "./supabase";

// ─── Type definitions (match the PostgreSQL schema) ─────────────────────────

export interface User {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: string;
  updatedAt: string;
  lastSignedIn: string;
}

export interface InsertUser {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
  lastSignedIn?: Date | string;
}

export interface Profile {
  id: number;
  userId: number;
  username: string;
  displayName: string;
  bio: string | null;
  profilePicUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  totalSubscribers: number;
  totalPosts: number;
  totalMedia: number;
  totalExclusive: number;
  totalLikes: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsertProfile {
  userId: number;
  username: string;
  displayName: string;
  bio?: string | null;
  profilePicUrl?: string | null;
  bannerUrl?: string | null;
}

export interface SubscriptionPlan {
  id: number;
  profileId: number;
  name: string;
  description: string | null;
  priceInCents: number;
  billingCycle: "monthly" | "quarterly" | "yearly" | "lifetime";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsertSubscriptionPlan {
  profileId: number;
  name: string;
  description?: string | null;
  priceInCents: number;
  billingCycle?: "monthly" | "quarterly" | "yearly" | "lifetime";
  isActive?: boolean;
}

export interface Content {
  id: number;
  profileId: number;
  title: string | null;
  description: string | null;
  contentType: "photo" | "video" | "post";
  mediaUrl: string;
  thumbnailUrl: string | null;
  isExclusive: boolean;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsertContent {
  profileId: number;
  title?: string | null;
  description?: string | null;
  contentType: "photo" | "video" | "post";
  mediaUrl: string;
  thumbnailUrl?: string | null;
  isExclusive?: boolean;
}

export interface Transaction {
  id: number;
  subscriptionId: number | null;
  profileId: number;
  subscriberId: number;
  amountInCents: number;
  platformFeeInCents: number;
  creatorEarningsInCents: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentGateway: "novaplex" | "blackout" | "pushinpay";
  externalTransactionId: string | null;
  webhookPayload: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsertTransaction {
  profileId: number;
  subscriberId: number;
  amountInCents: number;
  platformFeeInCents: number;
  creatorEarningsInCents: number;
  status?: string;
  paymentGateway: string;
  externalTransactionId?: string | null;
}

export interface Wallet {
  id: number;
  profileId: number;
  balanceInCents: number;
  totalEarningsInCents: number;
  totalWithdrawnInCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface InsertWallet {
  profileId: number;
  balanceInCents?: number;
  totalEarningsInCents?: number;
  totalWithdrawnInCents?: number;
}

// ─── User queries ───────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");

  const sb = getSupabase();
  if (!sb) {
    console.warn("[DB] Cannot upsert user: Supabase not available");
    return;
  }

  const values: Record<string, unknown> = {
    openId: user.openId,
    lastSignedIn: user.lastSignedIn || new Date().toISOString(),
  };
  if (user.name !== undefined) values.name = user.name;
  if (user.email !== undefined) values.email = user.email;
  if (user.loginMethod !== undefined) values.loginMethod = user.loginMethod;
  if (user.role !== undefined) values.role = user.role;

  const { error } = await sb
    .from("users")
    .upsert(values, { onConflict: "openId" });

  if (error) {
    console.error("[DB] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;

  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("openId", openId)
    .limit(1)
    .single();

  if (error || !data) return undefined;
  return data as User;
}

// ─── Profile queries ────────────────────────────────────────────────────────

export async function getProfileByUsername(username: string): Promise<Profile | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;

  const { data, error } = await sb
    .from("profiles")
    .select("*")
    .eq("username", username)
    .limit(1)
    .single();

  if (error || !data) return undefined;
  return data as Profile;
}

export async function getProfilesByUserId(userId: number): Promise<Profile[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("userId", userId);

  return (data || []) as Profile[];
}

export async function createProfile(profile: InsertProfile) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { data, error } = await sb
    .from("profiles")
    .insert(profile)
    .select("id")
    .single();

  if (error) throw error;
  return { insertId: data?.id };
}

export async function updateProfile(profileId: number, data: Partial<InsertProfile>) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { error } = await sb
    .from("profiles")
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq("id", profileId);

  if (error) throw error;
}

export async function deleteProfile(profileId: number) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { error } = await sb
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) throw error;
}

// ─── Content queries ────────────────────────────────────────────────────────

export async function getContentByProfileId(profileId: number): Promise<Content[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("content")
    .select("*")
    .eq("profileId", profileId)
    .order("createdAt", { ascending: false });

  return (data || []) as Content[];
}

export async function createContent(contentData: InsertContent) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { error } = await sb.from("content").insert(contentData);
  if (error) throw error;
}

// ─── Subscription queries ───────────────────────────────────────────────────

export async function getSubscriptionsByProfileId(profileId: number) {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("subscriptions")
    .select("*")
    .eq("profileId", profileId);

  return data || [];
}

export async function getActiveSubscriptions(profileId: number) {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("subscriptions")
    .select("*")
    .eq("profileId", profileId)
    .eq("status", "active");

  return data || [];
}

// ─── Transaction queries ────────────────────────────────────────────────────

export async function getTransactionsByProfileId(profileId: number): Promise<Transaction[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("transactions")
    .select("*")
    .eq("profileId", profileId)
    .order("createdAt", { ascending: false });

  return (data || []) as Transaction[];
}

export async function createTransaction(txData: InsertTransaction) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { data, error } = await sb
    .from("transactions")
    .insert(txData)
    .select("id")
    .single();

  if (error) throw error;
  return { insertId: data?.id };
}

// ─── Wallet queries ─────────────────────────────────────────────────────────

export async function getWalletByProfileId(profileId: number): Promise<Wallet | undefined> {
  const sb = getSupabase();
  if (!sb) return undefined;

  const { data } = await sb
    .from("wallets")
    .select("*")
    .eq("profileId", profileId)
    .limit(1)
    .single();

  return data as Wallet | undefined;
}

export async function createWallet(wallet: InsertWallet) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { error } = await sb.from("wallets").insert(wallet);
  if (error) throw error;
}

// ─── Subscription Plan queries ──────────────────────────────────────────────

export async function getSubscriptionPlansByProfileId(profileId: number): Promise<SubscriptionPlan[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("subscription_plans")
    .select("*")
    .eq("profileId", profileId)
    .eq("isActive", true);

  return (data || []) as SubscriptionPlan[];
}

export async function createSubscriptionPlan(plan: InsertSubscriptionPlan) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { data, error } = await sb
    .from("subscription_plans")
    .insert(plan)
    .select("id")
    .single();

  if (error) throw error;
  return { insertId: data?.id };
}

export async function updateSubscriptionPlan(planId: number, data: Partial<InsertSubscriptionPlan>) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { error } = await sb
    .from("subscription_plans")
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq("id", planId);

  if (error) throw error;
}

export async function deleteSubscriptionPlan(planId: number) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const { error } = await sb
    .from("subscription_plans")
    .delete()
    .eq("id", planId);

  if (error) throw error;
}

// ─── Admin queries ──────────────────────────────────────────────────────────

export async function getAllProfiles(): Promise<Profile[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb.from("profiles").select("*");
  return (data || []) as Profile[];
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data } = await sb
    .from("transactions")
    .select("*")
    .order("createdAt", { ascending: false });

  return (data || []) as Transaction[];
}

export async function updateTransactionStatus(txId: number, status: string, webhookPayload?: string) {
  const sb = getSupabase();
  if (!sb) throw new Error("Database not available");

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (webhookPayload) updateData.webhookPayload = webhookPayload;

  const { error } = await sb
    .from("transactions")
    .update(updateData)
    .eq("id", txId);

  if (error) throw error;
}
