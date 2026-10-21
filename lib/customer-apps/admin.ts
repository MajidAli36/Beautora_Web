import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Untyped admin client for customer_apps* tables until `types/database.types.ts`
 * is regenerated after applying the migration.
 */
export function caAdmin(): SupabaseClient {
  return createAdminClient() as unknown as SupabaseClient;
}
