/**
 * Vercel Serverless API — Webhook handler
 * Runs as Node.js serverless function (not Edge).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const webhookRateMap = new Map<string, { count: number; resetAt: number }>();
const webhookWindowMs = 60_000;
const webhookMaxPerMin = Number(process.env.WEBHOOK_RATE_LIMIT_PER_MIN || "120");

function setCors(req: VercelRequest, res: VercelResponse) {
    const origin = req.headers.origin;
    const allowed = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    if (origin && allowed.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-webhook-secret");
}

function getClientIp(req: VercelRequest) {
    const xff = req.headers["x-forwarded-for"];
    const val = Array.isArray(xff) ? xff[0] : xff;
    return (val?.split(",")[0] || req.socket.remoteAddress || "unknown").trim();
}

function isRateLimited(req: VercelRequest) {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = webhookRateMap.get(ip);

    if (!entry || entry.resetAt <= now) {
        webhookRateMap.set(ip, { count: 1, resetAt: now + webhookWindowMs });
        return false;
    }

    entry.count += 1;
    webhookRateMap.set(ip, entry);
    return entry.count > webhookMaxPerMin;
}

function isValidWebhookSecret(req: VercelRequest) {
    const expected = process.env.WEBHOOK_SHARED_SECRET;
    if (!expected) return true;
    const headerSecret = req.headers["x-webhook-secret"];
    const qsSecret = req.query.secret;
    const provided = (Array.isArray(headerSecret) ? headerSecret[0] : headerSecret) || (Array.isArray(qsSecret) ? qsSecret[0] : qsSecret);
    return provided === expected;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCors(req, res);

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    if (isRateLimited(req)) return res.status(429).json({ error: "Too many requests" });
    if (!isValidWebhookSecret(req)) return res.status(401).json({ error: "Invalid webhook secret" });

    try {
        const gateway = (req.query.gateway as string) || "unknown";
        const body = req.body;

        console.log(`[Webhook] Received ${gateway} webhook:`, JSON.stringify(body).slice(0, 500));

        const txId = body?.transaction_id || body?.id || body?.transactionId;
        const status = body?.status || body?.payment_status;

        // Mapeia os status que confirmam pagamento ou sucesso para "completed"
        const isPaid = ['completed', 'succeeded', 'paid', 'approved', 'confirmed'].includes((status || "").toLowerCase());
        const mappedStatus = isPaid ? "completed" : "pending"; // Falta mapear failed depois, mas vamos logar sucesso

        if (txId && status) {
            console.log(`[Webhook] Transaction ${txId} status recebido: ${status} | isPaid: ${isPaid}`);

            const url = process.env.SUPABASE_URL;
            const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

            if (url && key) {
                const { createClient } = require("@supabase/supabase-js");
                const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

                // 1. Encontra a transacao
                const { data: txData, error: findError } = await sb
                    .from("transactions")
                    .select("*")
                    .eq("externalTransactionId", String(txId))
                    .limit(1)
                    .single();

                if (txData && txData.status !== "completed" && isPaid) {
                    // Atualiza Transacao
                    await sb.from("transactions")
                        .update({
                            status: "completed",
                            webhookPayload: JSON.stringify(body)
                        })
                        .eq("id", txData.id);

                    console.log(`[Webhook] Transacao ID ${txData.id} (P=${txData.profileId}) marcada como completed.`);

                    // 2. Atualiza Carteira (Wallet) e Ganhos do Criador
                    const creatorEarnings = txData.creatorEarningsInCents || 0;

                    // Supabase function ou Rpc para add seria o ideal, mas via select->update funciona em volume baixo
                    const { data: walletData } = await sb.from("wallets").select("*").eq("profileId", txData.profileId).single();
                    if (walletData) {
                        await sb.from("wallets").update({
                            balanceInCents: walletData.balanceInCents + creatorEarnings,
                            totalEarningsInCents: walletData.totalEarningsInCents + creatorEarnings
                        }).eq("id", walletData.id);
                        console.log(`[Webhook] Wallet do Perfil ${txData.profileId} += ${creatorEarnings} em centavos.`);
                    } else {
                        // Se por algum motivo nao existir wallet
                        await sb.from("wallets").insert({
                            profileId: txData.profileId,
                            balanceInCents: creatorEarnings,
                            totalEarningsInCents: creatorEarnings
                        });
                        console.log(`[Webhook] Carteira criada do ZERO Perfil ${txData.profileId} += ${creatorEarnings}.`);
                    }
                } else if (!txData) {
                    console.log(`[Webhook] IGNORADO: Nenhuma transacao com ID Externo ${txId} foi encontrada no banco!`);
                }
            } else {
                console.error("[Webhook] Variaveis do Supabase nao configuradas para webhook!");
            }
        }

        return res.status(200).json({ received: true });
    } catch (err: any) {
        console.error("[Webhook] Error:", err);
        return res.status(500).json({ error: "Internal error" });
    }
}
