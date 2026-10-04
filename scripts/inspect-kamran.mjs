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
const email = "kamranakram164@gmail.com";
const userId = "da765011-eddb-4453-a163-1c7b922556ba";
const { data: user } = await admin.auth.admin.getUserById(userId);
const { data: mems, error: me } = await admin.from("organization_members").select("*").eq("user_id", userId);
const { data: orgsByName, error: oe } = await admin.from("organizations").select("id, name, city, country, admin_disabled, slug, email").or("name.ilike.%hair%,name.ilike.%saloon%,name.ilike.%salon%").limit(30);
const { data: staff, error: se } = await admin.from("staff").select("id, full_name, organization_id, user_id").or(`user_id.eq.${userId}`);
console.log(JSON.stringify({ userMeta: user.user?.user_metadata, emailConfirmed: user.user?.email_confirmed_at, mems, me, orgsByName, oe, staff, se }, null, 2));
