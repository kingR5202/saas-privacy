/**
 * Vercel Serverless API — tRPC handler
 * Handles all /api/trpc/* requests as a single serverless function.
 */
import "dotenv/config";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { initPaymentGateways } from "../server/payments";

// Initialize payment gateways once (cold start)
initPaymentGateways();

export default async function handler(req: Request): Promise<Response> {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    return fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: () => {
            // Simplified context for serverless — no Express req/res
            return {
                user: null,
                req: null as any,
                res: null as any,
            };
        },
    });
}

export const config = {
    runtime: "edge",
};
