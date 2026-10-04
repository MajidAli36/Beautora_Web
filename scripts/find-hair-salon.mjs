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
const { data: orgs, error } = await admin.from("organizations").select("id, name, city, country, slug").ilike("name", "%hair%").limit(20);
const { data: allRecent } = await admin.from("organizations").select("id, name, city, country, slug, created_at").order("created_at", { ascending: false }).limit(15);
console.log(JSON.stringify({ error, orgs, allRecent }, null, 2));
