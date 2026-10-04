import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function parseEnv(path) {
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}
const env = { ...parseEnv(resolve(root, ".env.production")), ...parseEnv(resolve(root, ".env.production.local")), ...parseEnv(resolve(root, ".env.local")) };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data: before, error: e1 } = await admin.from("marketplace_sellers").select("id, shop_name, status").eq("status", "pending");
if (e1) { console.error(e1.message); process.exit(1); }
const { data, error } = await admin.from("marketplace_sellers").update({ status: "approved" }).eq("status", "pending").select("id, shop_name, status");
if (error) { console.error(error.message); process.exit(1); }
console.log(JSON.stringify({ approvedCount: data?.length ?? 0, before: before?.length ?? 0, rows: data }, null, 2));
