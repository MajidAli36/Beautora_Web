/**
 * Carefully delete bot spam shopper accounts by display-name marker.
 *
 * Only deletes Auth users whose full_name / name metadata contains the spam
 * marker. Never deletes:
 *   - platform admins
 *   - users with organization membership
 *   - partners
 *   - marketplace sellers
 *   - users whose name does NOT match the marker (real accounts)
 *
 * Usage:
 *   node scripts/purge-spam-shoppers.mjs              # dry-run (safe)
 *   node scripts/purge-spam-shoppers.mjs --execute    # actually delete
 *   node scripts/purge-spam-shoppers.mjs --prod --execute
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

/** Unique spam name prefix from the bot flood (Turkish gambling promo + short link). */
const SPAM_MARKER = "15.000TL bonusla kasayi bosaltmaya basla!";

const EXECUTE = process.argv.includes("--execute");
const USE_PROD = process.argv.includes("--prod");

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
  const files = USE_PROD
    ? [".env.production", ".env.production.local"]
    : [
        ".env.production",
        ".env.production.local",
        ".env.local",
        ".env.development.local",
      ];
  for (const name of files) {
    Object.assign(merged, parseEnvFile(resolve(root, name)));
  }
  return merged;
}

function metaName(user) {
  const meta = user.user_metadata ?? {};
  for (const key of ["full_name", "name", "salon_name"]) {
    if (typeof meta[key] === "string" && meta[key].trim()) {
      return meta[key].trim();
    }
  }
  return "";
}

function isSpamName(name) {
  if (!name) return false;
  const n = name.trim();
  return n.includes(SPAM_MARKER) || n.toLowerCase().includes("bit.ly/4js23fg");
}

function isPlatformAdminEmail(email) {
  if (!email) return false;
  const list = (process.env.BEAUTORA_PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const e = email.toLowerCase();
  return e === "admin@syncops.tech" || list.includes(e);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Target: ${url}`);
console.log(`Mode: ${EXECUTE ? "EXECUTE (will delete)" : "DRY-RUN (no deletes)"}`);
console.log(`Spam marker: ${SPAM_MARKER.slice(0, 40)}…\n`);

async function listAllUsers() {
  const users = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users?.length ?? 0) < 200) break;
  }
  return users;
}

const allUsers = await listAllUsers();
console.log(`Auth users total: ${allUsers.length}`);

const spamCandidates = [];
const keepUsers = [];

for (const user of allUsers) {
  const name = metaName(user);
  if (isSpamName(name)) {
    spamCandidates.push(user);
  } else {
    keepUsers.push(user);
  }
}

console.log(`Name matches spam marker: ${spamCandidates.length}`);
console.log(`Other users (will keep): ${keepUsers.length}`);

// Extra safety: never delete users tied to real business data
const spamIds = spamCandidates.map((u) => u.id);
const protectedIds = new Set();

if (spamIds.length) {
  const chunk = 200;
  for (let i = 0; i < spamIds.length; i += chunk) {
    const slice = spamIds.slice(i, i + chunk);
    const [{ data: members }, { data: partners }, { data: sellers }] =
      await Promise.all([
        admin.from("organization_members").select("user_id").in("user_id", slice),
        admin.from("partners").select("user_id").in("user_id", slice),
        admin.from("marketplace_sellers").select("user_id").in("user_id", slice),
      ]);
    for (const row of members ?? []) {
      if (row.user_id) protectedIds.add(row.user_id);
    }
    for (const row of partners ?? []) {
      if (row.user_id) protectedIds.add(row.user_id);
    }
    for (const row of sellers ?? []) {
      if (row.user_id) protectedIds.add(row.user_id);
    }
  }
}

const toDelete = [];
const skippedProtected = [];

for (const user of spamCandidates) {
  const email = user.email ?? "";
  if (isPlatformAdminEmail(email) || protectedIds.has(user.id)) {
    skippedProtected.push({
      id: user.id,
      email,
      reason: isPlatformAdminEmail(email) ? "platform_admin" : "has_org_partner_or_seller",
      name: metaName(user).slice(0, 60),
    });
    continue;
  }
  toDelete.push(user);
}

console.log(`\nWill delete: ${toDelete.length}`);
console.log(`Skipped (protected despite spam name): ${skippedProtected.length}`);
console.log(`Real / non-spam kept: ${keepUsers.length}`);

const reportPath = resolve(root, "scripts/.spam-purge-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      target: url,
      mode: EXECUTE ? "execute" : "dry-run",
      totals: {
        authUsers: allUsers.length,
        spamNameMatches: spamCandidates.length,
        toDelete: toDelete.length,
        skippedProtected: skippedProtected.length,
        keptOther: keepUsers.length,
      },
      keepSample: keepUsers.slice(0, 30).map((u) => ({
        email: u.email,
        name: metaName(u) || null,
        created: u.created_at,
      })),
      skippedProtected,
      deleteSample: toDelete.slice(0, 20).map((u) => ({
        email: u.email,
        name: metaName(u).slice(0, 80),
        created: u.created_at,
      })),
    },
    null,
    2
  )
);
console.log(`\nReport written: ${reportPath}`);

if (!EXECUTE) {
  console.log("\nDry-run complete. Re-run with --execute to delete spam accounts.");
  console.log("Example: node scripts/purge-spam-shoppers.mjs --prod --execute");
  process.exit(0);
}

let deleted = 0;
let failed = 0;
const failures = [];
const CONCURRENCY = 12;

// Spam accounts already passed protected-id checks — delete Auth users only (cascades / set-null FKs).
async function deleteOne(user) {
  const email = user.email ?? "";
  try {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      failed += 1;
      failures.push({ email, id: user.id, error: error.message });
    } else {
      deleted += 1;
    }
  } catch (err) {
    failed += 1;
    failures.push({
      email,
      id: user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

for (let i = 0; i < toDelete.length; i += CONCURRENCY) {
  const batch = toDelete.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map((u) => deleteOne(u)));
  const done = Math.min(i + batch.length, toDelete.length);
  if (done % 100 < CONCURRENCY || done === toDelete.length) {
    console.log(`Progress: ${done}/${toDelete.length} (deleted ${deleted}, failed ${failed})`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: failed === 0,
      deleted,
      failed,
      keptOther: keepUsers.length,
      skippedProtected: skippedProtected.length,
      failures: failures.slice(0, 20),
    },
    null,
    2
  )
);
