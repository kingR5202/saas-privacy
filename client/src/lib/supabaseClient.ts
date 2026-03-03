/**
 * Supabase client for the frontend (browser).
 * Uses the ANON key — safe to expose in the browser.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://qcvrmbqyawmgezifunkh.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjdnJtYnF5YXdtZ2V6aWZ1bmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODkwNDksImV4cCI6MjA4Nzk2NTA0OX0.Y9hC13n7WrU6ajY69f7h9uuQktfT0AWDDAuKAtlhRF4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
