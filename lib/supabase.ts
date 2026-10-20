import { createClient, SupabaseClient } from "@supabase/supabase-js";

const fallbackUrl = "https://placeholder-project.supabase.co";
const fallbackAnonKey = "placeholder-anon-key";
const fallbackServiceKey = "placeholder-service-key";

// Safe factory for public client requests
export const getSupabase = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || fallbackAnonKey;
  return createClient(url, key);
};

// Client for public / authenticated browser requests (enforces RLS)
let _cachedSupabase: SupabaseClient | null = null;
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_cachedSupabase) {
      _cachedSupabase = getSupabase();
    }
    const val = (_cachedSupabase as any)[prop];
    return typeof val === "function" ? val.bind(_cachedSupabase) : val;
  },
});

// Admin client for backend tasks requiring full administrative override (service-role)
export const getServiceSupabase = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fallbackUrl;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    fallbackServiceKey;
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Proxied supabaseAdmin singleton that avoids crashing build when env vars are uninitialized
let _cachedAdmin: SupabaseClient | null = null;
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_cachedAdmin) {
      _cachedAdmin = getServiceSupabase();
    }
    const val = (_cachedAdmin as any)[prop];
    return typeof val === "function" ? val.bind(_cachedAdmin) : val;
  },
});
