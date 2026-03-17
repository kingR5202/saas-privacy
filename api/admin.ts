import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function setCors(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getBearerToken(req: VercelRequest) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const sb = getSupabaseAdmin();
  if (!sb) return res.status(500).json({ error: "Server not configured" });

  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: "Missing token" });

  const { data: authData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !authData.user) return res.status(401).json({ error: "Invalid token" });

  if (!isAllowedAdminEmail(authData.user.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }

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
