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
let user = null;
for (let page = 1; page <= 20; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email?.toLowerCase() === email) || null;
  if (user || data.users.length < 200) break;
}
if (!user) { console.log(JSON.stringify({ ok:false, error:"user_not_found" })); process.exit(1); }
const { data: upd, error: uerr } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
if (uerr) { console.log(JSON.stringify({ ok:false, error:uerr.message })); process.exit(1); }
const { data: orgs } = await admin.from("organizations").select("id, name, city, country, admin_disabled, marketplace_store_enabled, slug").ilike("name", "%hair cut%");
const { data: memberships } = await admin.from("organization_members").select("organization_id, role, organization:organizations(id, name, city, country, admin_disabled)").eq("user_id", user.id);
const orgIds = [...new Set([...(orgs??[]).map(o=>o.id), ...(memberships??[]).map(m=>m.organization_id)].filter(Boolean))];
const orgFixes = [];
for (const id of orgIds) {
  const { data: fixed, error } = await admin.from("organizations").update({ admin_disabled: false, admin_disabled_at: null }).eq("id", id).select("id, name, city, country, admin_disabled");
  orgFixes.push({ id, error: error?.message || null, row: fixed?.[0] || null });
}
const { data: sellers } = await admin.from("marketplace_sellers").update({ status: "approved" }).or(`user_id.eq.${user.id},organization_id.in.(${orgIds.length?orgIds.join(","):"00000000-0000-0000-0000-000000000000"})`).select("id, shop_name, status");
console.log(JSON.stringify({
  ok: true,
  userId: user.id,
  email,
  emailConfirmedAt: upd.user?.email_confirmed_at ?? null,
  memberships,
  orgsMatchedByName: orgs,
  orgFixes,
  sellersApproved: sellers,
}, null, 2));
