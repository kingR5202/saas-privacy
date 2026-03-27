import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
    // Diagnóstico: testa cada import
    const checks: Record<string, string> = {};

    try {
        require("crypto");
        checks.crypto = "ok";
    } catch (e: any) {
        checks.crypto = `FAIL: ${e.message}`;
    }

    try {
        require("@supabase/supabase-js");
        checks.supabase = "ok";
    } catch (e: any) {
        checks.supabase = `FAIL: ${e.message}`;
    }

    try {
        require("./_security");
        checks.security = "ok";
    } catch (e: any) {
        checks.security = `FAIL: ${e.message}`;
    }

    checks.env_SUPABASE_URL = process.env.SUPABASE_URL ? "set" : "MISSING";
    checks.env_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "MISSING";
    checks.env_ADMIN_EMAILS = process.env.ADMIN_EMAILS || "MISSING";
    checks.env_TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY ? "set" : "MISSING";
    checks.env_ADMIN_ROUTE_TOKEN = process.env.ADMIN_ROUTE_TOKEN ? "set" : "MISSING";
    checks.node_version = process.version;

    return res.status(200).json({ status: "alive", checks });
}
