/**
 * Vercel Serverless API — Webhook handler
 * Handles POST /api/webhooks?gateway=<name>
 */
import "dotenv/config";
import { updateTransactionStatus } from "../server/db";

export default async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const url = new URL(req.url);
        const gateway = url.searchParams.get("gateway") || url.pathname.split("/").pop() || "unknown";
        const body = await req.json();

        console.log(`[Webhook] Received ${gateway} webhook:`, JSON.stringify(body).slice(0, 500));

        // Extract transaction info based on gateway format
        const txId = body.transaction_id || body.id || body.transactionId;
        const status = body.status || body.payment_status;

        if (txId && status) {
            const normalizedStatus =
                status === "paid" || status === "completed" || status === "approved"
                    ? "completed"
                    : status === "expired"
                        ? "expired"
                        : status === "refunded"
                            ? "refunded"
                            : "pending";

            // TODO: look up internal transaction ID by external ID, then update
            console.log(`[Webhook] Transaction ${txId} status: ${normalizedStatus}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err: any) {
        console.error("[Webhook] Error:", err);
        return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export const config = {
    runtime: "edge",
};
