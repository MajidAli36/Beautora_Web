/**
 * Delete an auth user (and light related rows) so they can sign up again.
 * Usage: node scripts/purge-auth-user.mjs orgameticsbyws@gmail.com
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function loadEnv() {
  const merged = {};
  for (const name of [
    ".env.production",
    ".env.production.local",
    ".env.local",
    ".env.development.local",
  ]) {
    Object.assign(merged, parseEnvFile(resolve(root, name)));
  }
  return merged;
}

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/purge-auth-user.mjs <email>");
  process.exit(1);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env files");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUser() {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

const user = await findUser();
if (!user) {
  console.log(JSON.stringify({ ok: true, email, deleted: false, reason: "not_found" }));
  process.exit(0);
}

const userId = user.id;
const cleanup = {};

// Soft-related rows (ignore missing-table errors)
for (const [table, col] of [
  ["partners", "user_id"],
  ["organization_members", "user_id"],
  ["team_invitations", "email"],
]) {
  try {
    const q =
      col === "email"
        ? admin.from(table).delete().eq("email", email)
        : admin.from(table).delete().eq(col, userId);
    const { error } = await q;
    cleanup[table] = error ? error.message : "ok";
  } catch (e) {
    cleanup[table] = e instanceof Error ? e.message : String(e);
  }
}

const { error: delErr } = await admin.auth.admin.deleteUser(userId);
if (delErr) {
  console.error(JSON.stringify({ ok: false, email, userId, error: delErr.message, cleanup }));
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    email,
    deleted: true,
    userId,
    wasConfirmed: Boolean(user.email_confirmed_at),
    cleanup,
  })
);
