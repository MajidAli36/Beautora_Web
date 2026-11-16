/**
 * Supabase env accessors shared by browser + server clients.
 *
 * CRITICAL (Next.js): client bundles only inline *static* `process.env.NEXT_PUBLIC_*`
 * property access. Dynamic `process.env[name]` is NOT replaced and is always
 * undefined in the browser — that caused production Docker auth failures.
 */

function requireEnv(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return trimmed;
}

/** Treat Docker empty build-args ("") as unset. */
function nonempty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function getSupabaseUrl() {
  // Static access — required for Next.js client inlining
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    nonempty(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}

/**
 * Public Supabase key for browser + cookie server clients.
 * Supports legacy anon key and newer publishable key naming.
 * Empty ANON must not shadow a real PUBLISHABLE (use ||, not ??).
 */
export function getSupabaseAnonKey() {
  const key =
    nonempty(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    nonempty(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    key
  );
}

/** Server-only. Never import this into client components. */
export function getSupabaseServiceRoleKey() {
  return nonempty(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
