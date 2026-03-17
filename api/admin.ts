import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  setCors,
  setSecurityHeaders,
  getClientIp,
  isIpAllowed,
  isCountryBlocked,
  validateRouteToken,
  checkBruteForce,
  recordLoginAttempt,
  detectScraping,
  getSupabaseAdmin,
  getBearerToken,
  isAllowedAdminEmail,
  validateAdminSession,
} from "./_security";

type ProfileRow = {
  id: number;
  userId: string;
  username: string;
  displayName: string;
  isActive: boolean;
};

type TxRow = {
  id: number;
  subscriberId: string;
  profileId: number;
  paymentGateway: string;
  amountInCents: number;
  status: string;
  createdAt: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res, "GET, OPTIONS");
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const ip = getClientIp(req);

  // Layer 1: Anti-scraping
  if (detectScraping(req))
    return res.status(429).json({ error: "Rate limit exceeded" });

  // Layer 2: IP whitelist
  if (!isIpAllowed(ip)) {
    console.log(`[Admin] Blocked IP not in whitelist: ${ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }

  // Layer 3: Geo-blocking
  if (isCountryBlocked(req)) {
    console.log(`[Admin] Blocked country: ${req.headers["x-vercel-ip-country"]} IP: ${ip}`);
    return res.status(403).json({ error: "Forbidden" });
  }

  // Layer 4: Route token
  if (!validateRouteToken(req))
    return res.status(403).json({ error: "Forbidden" });

  // Layer 5: Brute force
  const bf = await checkBruteForce(ip);
  if (bf.blocked) {
    console.log(`[Admin] Brute-force blocked IP: ${ip} (${bf.failedCount} failures)`);
    return res.status(429).json({ error: "Bloqueado por tentativas excessivas. Tente em 24 h." });
  }

  // Layer 6: Auth
  const sb = getSupabaseAdmin();
  if (!sb) return res.status(500).json({ error: "Server not configured" });

  const token = getBearerToken(req);
  if (!token) {
    await recordLoginAttempt(ip, "unknown", false);
    return res.status(401).json({ error: "Missing token" });
  }

  const { data: authData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !authData.user) {
    await recordLoginAttempt(ip, "invalid_token", false);
    return res.status(401).json({ error: "Invalid token" });
  }

  // Layer 7: Admin email
  if (!isAllowedAdminEmail(authData.user.email)) {
    await recordLoginAttempt(ip, authData.user.email || "unknown", false);
    return res.status(403).json({ error: "Forbidden" });
  }

  // Layer 8: TOTP / Admin session
  if (process.env.TOTP_ENCRYPTION_KEY) {
    const sessionToken = req.headers["x-admin-session"] as string;
    if (!validateAdminSession(sessionToken, authData.user.id)) {
      const { data: fullUser } = await sb.auth.admin.getUserById(authData.user.id);
      const totpVerified = fullUser?.user?.app_metadata?.totp_verified === true;
      return res.status(403).json({
        error: "TOTP_REQUIRED",
        totpSetupNeeded: !totpVerified,
      });
    }
  }

  // ── Success ──────────────────────────────────────────────────
  await recordLoginAttempt(ip, authData.user.email || "", true);

  const [{ data: profilesData, error: pErr }, { data: txData, error: tErr }] = await Promise.all([
    sb.from("profiles").select("id,userId,username,displayName,isActive"),
    sb.from("transactions").select("id,subscriberId,profileId,paymentGateway,amountInCents,status,createdAt").order("createdAt", { ascending: false }).limit(500),
  ]);

  if (pErr || tErr) {
    return res.status(500).json({ error: "Failed to load admin data" });
  }

  const profiles = (profilesData || []) as ProfileRow[];
  const transactions = (txData || []) as TxRow[];

  const totalAmount = transactions
    .filter(t => ["completed", "paid", "succeeded"].includes(t.status))
    .reduce((sum, t) => sum + (t.amountInCents || 0), 0);

  const usersMap = new Map<string, { userId: string; profiles: number; totalPixGenerated: number; totalPixPaid: number; totalAmount: number }>();
  for (const p of profiles) {
    if (!usersMap.has(p.userId)) {
      usersMap.set(p.userId, { userId: p.userId, profiles: 0, totalPixGenerated: 0, totalPixPaid: 0, totalAmount: 0 });
    }
    usersMap.get(p.userId)!.profiles += 1;
  }

  const profileOwner = new Map<number, string>();
  for (const p of profiles) profileOwner.set(p.id, p.userId);

  for (const tx of transactions) {
    const ownerId = profileOwner.get(tx.profileId);
    if (!ownerId) continue;
    const user = usersMap.get(ownerId);
    if (!user) continue;
    user.totalPixGenerated += 1;
    if (["completed", "paid", "succeeded"].includes(tx.status)) {
      user.totalPixPaid += 1;
      user.totalAmount += tx.amountInCents || 0;
    }
  }

  return res.status(200).json({
    stats: {
      totalUsers: usersMap.size,
      totalProfiles: profiles.length,
      totalPixGenerated: transactions.length,
      totalPixPaid: transactions.filter(t => ["completed", "paid", "succeeded"].includes(t.status)).length,
      totalAmount,
      activeCreators: profiles.filter(p => p.isActive).length,
    },
    users: Array.from(usersMap.values()),
    transactions,
  });
}
