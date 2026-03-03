/**
 * Vercel Serverless API — Webhook handler
 * Runs as Node.js serverless function (not Edge).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") return res.status(204).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    try {
        const gateway = (req.query.gateway as string) || "unknown";
        const body = req.body;

        console.log(`[Webhook] Received ${gateway} webhook:`, JSON.stringify(body).slice(0, 500));

        const txId = body?.transaction_id || body?.id || body?.transactionId;
        const status = body?.status || body?.payment_status;

        if (txId && status) {
            console.log(`[Webhook] Transaction ${txId} status: ${status}`);
            // TODO: Update transaction in Supabase
        }

        return res.status(200).json({ received: true });
    } catch (err: any) {
        console.error("[Webhook] Error:", err);
        return res.status(500).json({ error: "Internal error" });
    }
}
