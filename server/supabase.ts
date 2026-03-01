/**
 * Supabase client for server-side operations.
 * Uses the service_role key for full database access.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    if (_supabase) return _supabase;

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.warn("[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
        return null;
    }

    _supabase = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    console.log("[Supabase] Client initialized");
    return _supabase;
}
