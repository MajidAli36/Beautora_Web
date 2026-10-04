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
const env = {
  ...parseEnv(resolve(root, ".env.production")),
  ...parseEnv(resolve(root, ".env.production.local")),
  ...parseEnv(resolve(root, ".env.local")),
};
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: sellers, error: sErr } = await admin
  .from("marketplace_sellers")
  .update({ status: "approved" })
  .eq("status", "pending")
  .select("id, shop_name, status");
if (sErr) {
  console.error(sErr.message);
  process.exit(1);
}

const { data: products, error: pErr } = await admin
  .from("marketplace_products")
  .update({ status: "published", updated_at: new Date().toISOString() })
  .eq("status", "pending")
  .select("id, title, status");
if (pErr) {
  console.error(pErr.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      sellersApproved: sellers?.length ?? 0,
      sellers,
      productsPublished: products?.length ?? 0,
      products,
    },
    null,
    2
  )
);
