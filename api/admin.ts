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

  // Layer 2: IP whitelist (desabilitado — use ADMIN_EMAILS + TOTP para controle de acesso)
  // if (!isIpAllowed(ip)) { ... }

  // Layer 3: Geo-blocking
  if (isCountryBlocked(req)) {
    console.log(`[Admin] Bloqueado por país: ${req.headers["x-vercel-ip-country"]} — IP: ${ip}`);
    return res.status(403).json({ error: "Acesso negado: conexões deste país estão bloqueadas (BLOCKED_COUNTRIES).", layer: "geo_block" });
  }

  // Layer 4: Route token
  if (!validateRouteToken(req)) {
    console.log(`[Admin] Token de rota inválido de IP: ${ip}`);
    return res.status(403).json({ error: "Acesso negado: token de rota inválido (ADMIN_ROUTE_TOKEN).", layer: "route_token" });
  }

  // Layer 5: Brute force
  const bf = await checkBruteForce(ip);
  if (bf.blocked) {
    console.log(`[Admin] Bloqueado por força bruta: ${ip} (${bf.failedCount} falhas)`);
    return res.status(429).json({ error: `Bloqueado por ${bf.failedCount} tentativas falhas. Acesso liberado em 24h. Para desbloquear agora, execute no Supabase: DELETE FROM admin_login_attempts WHERE success = false;`, layer: "brute_force" });
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
    console.log(`[Admin] Email não autorizado: ${authData.user.email} de IP: ${ip}`);
    await recordLoginAttempt(ip, authData.user.email || "unknown", false);
    return res.status(403).json({
      error: `Acesso negado: o email "${authData.user.email}" não está na lista de administradores. Configure a variável ADMIN_EMAILS no Vercel com este email.`,
      layer: "email_whitelist",
    });
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

  const [{ data: profilesData, error: pErr }, { data: txData, error: tErr }, { data: logsData }] = await Promise.all([
    sb.from("profiles").select("id,userId,username,displayName,isActive"),
    sb.from("transactions").select("id,subscriberId,profileId,paymentGateway,amountInCents,status,createdAt").order("createdAt", { ascending: false }).limit(500),
    sb.from("admin_login_attempts").select("id,ip_address,user_email,success,attempted_at").order("attempted_at", { ascending: false }).limit(50),
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
    accessLogs: (logsData || []) as { id: number; ip_address: string; user_email: string | null; success: boolean; attempted_at: string }[],
    currentIp: ip,
  });
}
