/**
 * Centralized Security Module for API Endpoints
 *
 * Layers provided:
 *  1. CORS enforcement (origin allowlist)
 *  2. IP whitelist (ADMIN_ALLOWED_IPS)
 *  3. Geo-blocking via Vercel x-vercel-ip-country header (BLOCKED_COUNTRIES)
 *  4. Admin route token validation (ADMIN_ROUTE_TOKEN)
 *  5. Brute force protection – 24h block after N failures (Supabase + in-memory)
 *  6. Anti-scraping – burst & sustained-rate detection per IP
 *  7. TOTP (Google Authenticator) – generation, verification, encryption at rest
 *  8. Admin session tokens (post-TOTP, 30 min expiry)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════
// Supabase admin client
// ═══════════════════════════════════════════════════════════════════

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ═══════════════════════════════════════════════════════════════════
// IP / CORS / Headers
// ═══════════════════════════════════════════════════════════════════

export function getClientIp(req: VercelRequest): string {
  const xff = req.headers["x-forwarded-for"];
  const val = Array.isArray(xff) ? xff[0] : xff;
  return (val?.split(",")[0] || req.socket.remoteAddress || "unknown").trim();
}

export function setCors(
  req: VercelRequest,
  res: VercelResponse,
  methods = "GET, POST, OPTIONS",
) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-admin-token, x-admin-session",
  );
}

export function setSecurityHeaders(res: VercelResponse) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
}

// ═══════════════════════════════════════════════════════════════════
// IP Whitelist
// ═══════════════════════════════════════════════════════════════════

export function isIpAllowed(ip: string): boolean {
  const whitelist = (process.env.ADMIN_ALLOWED_IPS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (whitelist.length === 0) return true; // not configured → allow all
  return whitelist.includes(ip);
}

// ═══════════════════════════════════════════════════════════════════
// Geo-Blocking (Vercel provides x-vercel-ip-country automatically)
// ═══════════════════════════════════════════════════════════════════

export function isCountryBlocked(req: VercelRequest): boolean {
  const blocked = (process.env.BLOCKED_COUNTRIES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  if (blocked.length === 0) return false;
  const country = (
    (req.headers["x-vercel-ip-country"] as string) || ""
  ).toUpperCase();
  if (!country) return false;
  return blocked.includes(country);
}

// ═══════════════════════════════════════════════════════════════════
// Admin Route Token (obscurity layer)
// ═══════════════════════════════════════════════════════════════════

export function validateRouteToken(req: VercelRequest): boolean {
  const expected = process.env.ADMIN_ROUTE_TOKEN;
  if (!expected) return true; // not configured → skip
  const provided = req.headers["x-admin-token"] as string;
  if (!provided || provided.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(provided, "utf8"),
    );
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Brute Force Protection (Supabase-persistent + in-memory fallback)
// ═══════════════════════════════════════════════════════════════════

const MAX_ATTEMPTS = Number(process.env.ADMIN_MAX_ATTEMPTS || "3");
const BLOCK_MS = 24 * 60 * 60 * 1000; // 24 hours

// --- in-memory fallback ---
const memAttempts = new Map<
  string,
  { count: number; blockedUntil: number }
>();

function checkMemBruteForce(ip: string): {
  blocked: boolean;
  failedCount: number;
} {
  const now = Date.now();
  const e = memAttempts.get(ip);
  if (!e) return { blocked: false, failedCount: 0 };
  if (e.blockedUntil > now) return { blocked: true, failedCount: e.count };
  if (e.blockedUntil > 0) {
    memAttempts.delete(ip);
    return { blocked: false, failedCount: 0 };
  }
  return { blocked: e.count >= MAX_ATTEMPTS, failedCount: e.count };
}

function recordMemAttempt(ip: string, success: boolean) {
  if (success) {
    memAttempts.delete(ip);
    return;
  }
  const e = memAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  e.count += 1;
  if (e.count >= MAX_ATTEMPTS) {
    e.blockedUntil = Date.now() + BLOCK_MS;
    console.log(
      `[Security] IP ${ip} blocked for 24 h after ${e.count} failures`,
    );
  }
  memAttempts.set(ip, e);
}

// --- primary: Supabase persistent ---

export async function checkBruteForce(
  ip: string,
): Promise<{ blocked: boolean; failedCount: number }> {
  const sb = getSupabaseAdmin();
  if (!sb) return checkMemBruteForce(ip);

  const cutoff = new Date(Date.now() - BLOCK_MS).toISOString();
  const { data, error } = await sb
    .from("admin_login_attempts")
    .select("id")
    .eq("ip_address", ip)
    .eq("success", false)
    .gte("attempted_at", cutoff);

  if (error) return checkMemBruteForce(ip); // table doesn't exist → fallback
  const failedCount = data?.length || 0;
  return { blocked: failedCount >= MAX_ATTEMPTS, failedCount };
}

export async function recordLoginAttempt(
  ip: string,
  email: string,
  success: boolean,
): Promise<void> {
  recordMemAttempt(ip, success);
  const sb = getSupabaseAdmin();
  if (!sb) return;

  await sb
    .from("admin_login_attempts")
    .insert({
      ip_address: ip,
      user_email: email,
      success,
      attempted_at: new Date().toISOString(),
    })
    .then(() => {}, () => {});

  if (success) {
    await sb
      .from("admin_login_attempts")
      .delete()
      .eq("ip_address", ip)
      .eq("success", false)
      .then(() => {}, () => {});
  }
}

// ═══════════════════════════════════════════════════════════════════
// Anti-Scraping Detection (burst + sustained rate per IP)
// ═══════════════════════════════════════════════════════════════════

const scraperMap = new Map<
  string,
  { ts: number[]; blockedUntil: number }
>();
const SCRAPE_WINDOW = 60_000; // 1 min
const SCRAPE_MAX = Number(process.env.SCRAPING_MAX_PER_MIN || "60");
const BURST_WINDOW = 5_000; // 5 s
const BURST_MAX = 15;
const SCRAPE_BLOCK = 3_600_000; // 1 h

export function detectScraping(req: VercelRequest): boolean {
  const ip = getClientIp(req);
  const now = Date.now();
  let e = scraperMap.get(ip);
  if (!e) {
    e = { ts: [], blockedUntil: 0 };
    scraperMap.set(ip, e);
  }

  if (e.blockedUntil > now) return true;
  if (e.blockedUntil > 0) {
    e.ts = [];
    e.blockedUntil = 0;
  }

  e.ts.push(now);
  e.ts = e.ts.filter((t) => now - t < SCRAPE_WINDOW);

  if (e.ts.length > SCRAPE_MAX) {
    e.blockedUntil = now + SCRAPE_BLOCK;
    console.log(
      `[Anti-Scrape] IP ${ip} blocked: ${e.ts.length} reqs/min`,
    );
    return true;
  }

  const burst = e.ts.filter((t) => now - t < BURST_WINDOW);
  if (burst.length > BURST_MAX) {
    e.blockedUntil = now + SCRAPE_BLOCK;
    console.log(
      `[Anti-Scrape] IP ${ip} burst blocked: ${burst.length} reqs/5 s`,
    );
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════
// TOTP – Google Authenticator (pure Node.js, no external deps)
// ═══════════════════════════════════════════════════════════════════

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function bytesToBase32(buf: Buffer): string {
  let bits = "";
  for (const b of buf) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) {
    out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  }
  return out;
}

function base32ToBytes(s: string): Buffer {
  let bits = "";
  for (const c of s.toUpperCase()) {
    const idx = B32.indexOf(c);
    if (idx >= 0) bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function generateTotpSecret(): { hex: string; base32: string } {
  const raw = crypto.randomBytes(20);
  return { hex: raw.toString("hex"), base32: bytesToBase32(raw) };
}

export function buildOtpauthUri(
  base32: string,
  email: string,
  issuer = "SaaSPrivacy",
): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${base32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function computeTotp(base32Secret: string, counter?: number): string {
  const time = counter ?? Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(time));
  const hash = crypto
    .createHmac("sha1", base32ToBytes(base32Secret))
    .update(buf)
    .digest();
  const off = hash[hash.length - 1] & 0x0f;
  const code =
    ((hash[off] & 0x7f) << 24) |
    ((hash[off + 1] & 0xff) << 16) |
    ((hash[off + 2] & 0xff) << 8) |
    (hash[off + 3] & 0xff);
  return (code % 1_000_000).toString().padStart(6, "0");
}

export function verifyTotp(
  base32Secret: string,
  code: string,
  window = 1,
): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const curr = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (computeTotp(base32Secret, curr + i) === code) return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════════
// AES-256-GCM encryption for TOTP secrets at rest
// ═══════════════════════════════════════════════════════════════════

function getEncKey(): Buffer {
  const k = process.env.TOTP_ENCRYPTION_KEY;
  if (!k || k.length !== 64)
    throw new Error("TOTP_ENCRYPTION_KEY must be 64 hex chars (32 bytes)");
  return Buffer.from(k, "hex");
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid ciphertext format");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncKey(),
    Buffer.from(parts[0], "hex"),
  );
  decipher.setAuthTag(Buffer.from(parts[1], "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(parts[2], "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ═══════════════════════════════════════════════════════════════════
// Admin Session Token (issued after TOTP verification, 30 min)
// ═══════════════════════════════════════════════════════════════════

const SESSION_MS = 30 * 60_000;

export function issueAdminSession(userId: string): string {
  const key = process.env.TOTP_ENCRYPTION_KEY || "";
  const expires = Date.now() + SESSION_MS;
  const payload = `${userId}:${expires}`;
  const sig = crypto.createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function validateAdminSession(
  token: string | undefined,
  expectedUserId: string,
): boolean {
  const key = process.env.TOTP_ENCRYPTION_KEY;
  if (!key) return true; // TOTP not configured globally → skip session check

  if (!token) return false;
  const parts = token.split(":");
  if (parts.length !== 3) return false;

  const [userId, expiresStr, sig] = parts;
  const payload = `${userId}:${expiresStr}`;
  const expected = crypto
    .createHmac("sha256", key)
    .update(payload)
    .digest("hex");

  try {
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))
    )
      return false;
  } catch {
    return false;
  }

  if (Date.now() > parseInt(expiresStr, 10)) return false;
  if (userId !== expectedUserId) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

export function getBearerToken(req: VercelRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export function isAllowedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
