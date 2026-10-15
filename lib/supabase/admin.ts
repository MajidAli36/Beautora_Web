import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/database.types";

let adminSingleton: SupabaseClient<Database> | null = null;

export function createAdminClient() {
  if (adminSingleton) return adminSingleton;

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  adminSingleton = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminSingleton;
}

/** Returns null when the service role key is not configured (e.g. public pages in dev). */
export function tryCreateAdminClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}
