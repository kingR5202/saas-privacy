/**
 * Vercel Serverless API — tRPC handler
 * Runs as Node.js serverless function (not Edge).
 * 
 * NOTE: This is a simplified handler for the public-facing API.
 * Full tRPC with auth context runs on the Express server (server/_core/index.ts).
 * This serverless function handles public queries only (profiles, plans, payments).
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase from Vercel env vars
function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") return res.status(204).end();

    const sb = getSupabase();
    if (!sb) return res.status(500).json({ error: "Database not configured" });

    // Extract the tRPC path from the URL
    const url = new URL(req.url || "/", `https://${req.headers.host}`);
    const trpcPath = url.pathname.replace("/api/trpc/", "").replace("/api/trpc", "");

    try {
        // Route to appropriate handler
        switch (trpcPath) {
            case "profiles.getByUsername": {
                const input = JSON.parse((url.searchParams.get("input") || "{}"));
                const username = input?.["0"]?.json || input;
                const { data } = await sb.from("profiles").select("*").eq("username", username).limit(1).single();
                return res.json([{ result: { data: { json: data } } }]);
            }

            case "subscriptionPlans.getByProfile": {
                const input = JSON.parse((url.searchParams.get("input") || "{}"));
                const profileId = input?.["0"]?.json || input;
                const { data } = await sb.from("subscription_plans").select("*").eq("profileId", profileId).eq("isActive", true);
                return res.json([{ result: { data: { json: data || [] } } }]);
            }

            case "content.getByProfile": {
                const input = JSON.parse((url.searchParams.get("input") || "{}"));
                const profileId = input?.["0"]?.json || input;
                const { data } = await sb.from("content").select("*").eq("profileId", profileId).order("createdAt", { ascending: false });
                return res.json([{ result: { data: { json: data || [] } } }]);
            }

            case "payments.availableGateways": {
                const gateways: string[] = [];
                if (process.env.PUSHINPAY_API_TOKEN) gateways.push("pushinpay");
                if (process.env.BLACKOUT_PUBLIC_KEY) gateways.push("blackout");
                if (process.env.NOVAPLEX_API_KEY) gateways.push("novaplex");
                return res.json([{ result: { data: { json: gateways } } }]);
            }

            case "auth.me": {
                return res.json([{ result: { data: { json: null } } }]);
            }

            default:
                return res.status(404).json({ error: { message: `Route not found: ${trpcPath}` } });
        }
    } catch (err: any) {
        console.error("[tRPC API]", err);
        return res.status(500).json({ error: { message: err.message || "Internal error" } });
    }
}
