/**
 * Payment API proxy — routes to user's configured gateway.
 * Reads gateway credentials from Supabase `gateway_configs` table.
 * Supports: PushinPay, Blackout (BlackPayments), NovaPlex
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const rateWindowMs = 60_000;
const maxRequestsPerWindow = Number(process.env.PAYMENT_RATE_LIMIT_PER_MIN || "30");
const paymentRateMap = new Map<string, { count: number; resetAt: number }>();

function setCors(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin;
    const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (origin && allowed.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function getClientIp(req: VercelRequest) {
    const xff = req.headers["x-forwarded-for"];
    const val = Array.isArray(xff) ? xff[0] : xff;
    return (val?.split(",")[0] || req.socket.remoteAddress || "unknown").trim();
}

function isRateLimited(req: VercelRequest) {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = paymentRateMap.get(ip);

    if (!entry || entry.resetAt <= now) {
        paymentRateMap.set(ip, { count: 1, resetAt: now + rateWindowMs });
        return false;
    }

    entry.count += 1;
    if (entry.count > maxRequestsPerWindow) return true;
    paymentRateMap.set(ip, entry);
    return false;
}

function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function generateCPF() {
    const rnd = (n: number) => Math.round(Math.random() * n);
    const mod = (a: number, b: number) => Math.round(a - (Math.floor(a / b) * b));
    const n = Array(9).fill(0).map(() => rnd(9));
    let d1 = n.reduce((t, num, i) => t + (num * (10 - i)), 0);
    d1 = 11 - mod(d1, 11); if (d1 >= 10) d1 = 0;
    let d2 = n.reduce((t, num, i) => t + (num * (11 - i)), 0) + (d1 * 2);
    d2 = 11 - mod(d2, 11); if (d2 >= 10) d2 = 0;
    return [...n, d1, d2].join('');
}

// ============ PUSHINPAY ============
async function pushinpayCreate(token: string, amountCents: number) {
    const res = await fetch('https://api.pushinpay.com.br/api/pix/cashIn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ value: amountCents }),
    });
    return res.json();
}
async function pushinpayCheck(token: string, id: string) {
    const res = await fetch(`https://api.pushinpay.com.br/api/transactions/${encodeURIComponent(id)}`, {
        headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    return res.json();
}

// ============ BLACKOUT ============
async function blackoutCreate(publicKey: string, secretKey: string, amountCents: number) {
    const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');
    const res = await fetch('https://api.blackpayments.pro/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': auth },
        body: JSON.stringify({
            amount: amountCents, paymentMethod: 'pix',
            customer: { name: "Cliente", email: "cliente@anonimo.com", document: { number: generateCPF(), type: "cpf" } },
            items: [{ title: "Acesso Premium", unitPrice: amountCents, quantity: 1, tangible: false }],
        }),
    });
    return res.json();
}
async function blackoutCheck(publicKey: string, secretKey: string, id: string) {
    const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');
    const res = await fetch(`https://api.blackpayments.pro/v1/transactions/${encodeURIComponent(id)}`, {
        headers: { 'Accept': 'application/json', 'Authorization': auth },
    });
    return res.json();
}

// ============ NOVAPLEX ============
async function novaplexAuth(clientId: string, clientSecret: string) {
    const res = await fetch('https://api.novaplex.com.br/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
    });
    const data = await res.json();
    if (!data.token) throw new Error('NovaPlex auth failed');
    return data.token;
}
async function novaplexCreate(clientId: string, clientSecret: string, amountCents: number) {
    const token = await novaplexAuth(clientId, clientSecret);
    const externalId = `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const res = await fetch('https://api.novaplex.com.br/api/payments/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: amountCents / 100, external_id: externalId, payer: { name: "Cliente", email: "cliente@pedido.com", document: generateCPF() } }),
    });
    const data = await res.json();
    const qrData = data.qrCodeResponse || {};
    const pixCode = qrData.qrcode || data.qrcode || '';
    const match = pixCode.match(/at\/([a-fA-F0-9-]{36})/);
    const txId = (match && match[1]) || qrData.transactionId || data.id || externalId;
    return { id: txId, qr_code: pixCode, status: 'PENDING', amount: amountCents };
}
async function novaplexCheck(clientId: string, clientSecret: string, id: string) {
    const token = await novaplexAuth(clientId, clientSecret);
    const res = await fetch(`https://api.novaplex.com.br/api/payments/deposit/${encodeURIComponent(id)}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
    });
    if (res.ok) {
        const data = await res.json();
        const st = (data.status || 'PENDING').toLowerCase();
        const paid = ['completed', 'succeeded', 'paid', 'approved', 'confirmed'].includes(st);
        return { status: paid ? 'paid' : 'pending' };
    }
    return { status: 'pending' };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(req, res);
    if (req.method === "OPTIONS") return res.status(204).end();

    if (isRateLimited(req)) {
        return res.status(429).json({ error: "Too many requests" });
    }

    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: "Database not configured" });

    try {
        // Resolve owner by profile to avoid forged userId in requests
        const profileId = req.body?.profileId || req.query.profileId;
        if (!profileId) return res.status(400).json({ error: "Profile ID required" });

        const parsedProfileId = parseInt(String(profileId), 10);
        if (!Number.isFinite(parsedProfileId) || parsedProfileId <= 0) {
            return res.status(400).json({ error: "Invalid profileId" });
        }

        const { data: profileData } = await sb
            .from("profiles")
            .select("userId")
            .eq("id", parsedProfileId)
            .limit(1)
            .single();
        if (!profileData?.userId) return res.status(404).json({ error: "Profile not found" });
        const userId = profileData.userId;

        // Load gateway config
        const { data: gwConfig } = await sb.from("gateway_configs").select("*").eq("userId", userId).limit(1).single();
        if (!gwConfig) return res.status(400).json({ error: "Gateway não configurado. Configure no Dashboard." });

        // POST: Create payment
        if (req.method === "POST") {
            const amount = parseInt(String(req.body?.amount || "0"), 10);
            if (!Number.isFinite(amount) || amount < 100 || amount > 100000000) {
                return res.status(400).json({ error: "Invalid amount" });
            }

            let result;
            let externalId = "";
            switch (gwConfig.gateway) {
                case "pushinpay":
                    if (!gwConfig.pushinpay_token) return res.status(400).json({ error: "Token PushinPay não configurado" });
                    result = await pushinpayCreate(gwConfig.pushinpay_token, amount);
                    externalId = result.id;
                    break;
                case "blackout":
                    if (!gwConfig.blackout_public_key || !gwConfig.blackout_secret_key) return res.status(400).json({ error: "Chaves Blackout não configuradas" });
                    result = await blackoutCreate(gwConfig.blackout_public_key, gwConfig.blackout_secret_key, amount);
                    externalId = result.transaction_id || result.id;
                    break;
                case "novaplex":
                    if (!gwConfig.novaplex_client_id || !gwConfig.novaplex_client_secret) return res.status(400).json({ error: "Credenciais NovaPlex não configuradas" });
                    result = await novaplexCreate(gwConfig.novaplex_client_id, gwConfig.novaplex_client_secret, amount);
                    externalId = result.id;
                    break;
                default:
                    return res.status(400).json({ error: "Gateway desconhecido: " + gwConfig.gateway });
            }

            if (externalId) {
                // Salvar transação no banco de dados
                const platformFee = Math.round(amount * 0.10); // 10% fee
                const creatorEarnings = amount - platformFee;
                
                // Get a placeholder user ID if not provided (for public profile checkout)
                // In a real app we'd map this better, but Drizzle schema requires subscriberId
                const subscriberId = userId || 1; // Fallback or public user

                const { error: txError } = await sb.from("transactions").insert({
                    profileId: parsedProfileId,
                    subscriberId: parseInt(subscriberId as string),
                    amountInCents: amount,
                    platformFeeInCents: platformFee,
                    creatorEarningsInCents: creatorEarnings,
                    status: "pending",
                    paymentGateway: gwConfig.gateway,
                    externalTransactionId: externalId
                });
                
                if (txError) {
                    console.error("[Payment API] Error saving transaction:", txError);
                }
            }

            return res.status(200).json(result);
        }

        // GET: Check payment status
        if (req.method === "GET") {
            const id = req.query.id as string;
            if (!id) return res.status(400).json({ error: "Missing transaction ID" });

            let result;
            switch (gwConfig.gateway) {
                case "pushinpay":
                    result = await pushinpayCheck(gwConfig.pushinpay_token, id);
                    break;
                case "blackout":
                    result = await blackoutCheck(gwConfig.blackout_public_key, gwConfig.blackout_secret_key, id);
                    break;
                case "novaplex":
                    result = await novaplexCheck(gwConfig.novaplex_client_id, gwConfig.novaplex_client_secret, id);
                    break;
                default:
                    return res.status(400).json({ error: "Gateway desconhecido" });
            }
            return res.status(200).json(result);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (err: any) {
        console.error("[Payment API]", err);
        return res.status(500).json({ error: err.message || "Internal error" });
    }
}
