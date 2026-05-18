import { createClient } from "@supabase/supabase-js";

// Fallbacks prevent module-load errors during build; real values are required at runtime.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service";

export const supabase = createClient(url, anon);

export const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false },
});
