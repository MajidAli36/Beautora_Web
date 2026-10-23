/**
 * Fast SQL purge of spam shopper Auth users (avoids Auth Admin API rate limits).
 *
 * Only deletes auth.users whose metadata name contains the spam marker.
 * Never deletes platform admin, org members, partners, or marketplace sellers.
 *
 * Usage:
 *   node scripts/purge-spam-shoppers-sql.mjs --prod           # dry-run
 *   node scripts/purge-spam-shoppers-sql.mjs --prod --execute
 */
import pg from "pg";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SPAM_MARKER = "15.000TL bonusla kasayi bosaltmaya basla!";
const BITLY_MARKER = "bit.ly/4js23fg";

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

const env = loadEnv();
const databaseUrl = env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL in env");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
console.log(`Spam marker: ${SPAM_MARKER.slice(0, 40)}…\n`);

const spamWhere = `
  (
    coalesce(u.raw_user_meta_data->>'full_name', '') ILIKE '%' || $1 || '%'
    OR coalesce(u.raw_user_meta_data->>'name', '') ILIKE '%' || $1 || '%'
    OR coalesce(u.raw_user_meta_data->>'full_name', '') ILIKE '%' || $2 || '%'
    OR coalesce(u.raw_user_meta_data->>'name', '') ILIKE '%' || $2 || '%'
  )
`;

const { rows: totals } = await client.query(
  `
  select
    (select count(*)::int from auth.users) as auth_total,
    (
      select count(*)::int from auth.users u
      where ${spamWhere}
    ) as spam_matches,
    (
      select count(*)::int from auth.users u
      where not (${spamWhere})
    ) as keep_other
  `,
  [SPAM_MARKER, BITLY_MARKER]
);

console.log(`Auth users total: ${totals[0].auth_total}`);
console.log(`Spam name matches: ${totals[0].spam_matches}`);
console.log(`Other users (keep): ${totals[0].keep_other}`);

const { rows: keepRows } = await client.query(
  `
  select
    u.email,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as name,
    u.created_at
  from auth.users u
  where not (${spamWhere})
  order by u.created_at asc
  `,
  [SPAM_MARKER, BITLY_MARKER]
);

console.log("\nReal accounts that will be KEPT:");
for (const row of keepRows) {
  console.log(`  - ${row.email} | ${row.name ?? "(no name)"}`);
}

const { rows: deletable } = await client.query(
  `
  select count(*)::int as n
  from auth.users u
  where ${spamWhere}
    and lower(coalesce(u.email, '')) <> 'admin@syncops.tech'
    and not exists (
      select 1 from public.organization_members m where m.user_id = u.id
    )
    and not exists (
      select 1 from public.partners p where p.user_id = u.id
    )
    and not exists (
      select 1 from public.marketplace_sellers s where s.user_id = u.id
    )
  `,
  [SPAM_MARKER, BITLY_MARKER]
);

const { rows: protectedSpam } = await client.query(
  `
  select u.id, u.email,
    coalesce(u.raw_user_meta_data->>'full_name', '') as name
  from auth.users u
  where ${spamWhere}
    and (
      lower(coalesce(u.email, '')) = 'admin@syncops.tech'
      or exists (select 1 from public.organization_members m where m.user_id = u.id)
      or exists (select 1 from public.partners p where p.user_id = u.id)
      or exists (select 1 from public.marketplace_sellers s where s.user_id = u.id)
    )
  `,
  [SPAM_MARKER, BITLY_MARKER]
);

console.log(`\nWill delete: ${deletable[0].n}`);
console.log(`Skipped protected (spam name but real ties): ${protectedSpam.length}`);

const reportPath = resolve(root, "scripts/.spam-purge-sql-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: EXECUTE ? "execute" : "dry-run",
      totals: totals[0],
      willDelete: deletable[0].n,
      kept: keepRows,
      protectedSpam,
    },
    null,
    2
  )
);
console.log(`Report: ${reportPath}`);

if (!EXECUTE) {
  console.log("\nDry-run only. Re-run with --execute to delete.");
  await client.end();
  process.exit(0);
}

if (keepRows.length < 5) {
  console.error("Abort: expected more real users to keep — refusing to delete.");
  await client.end();
  process.exit(1);
}

const { rowCount } = await client.query(
  `
  delete from auth.users u
  where ${spamWhere}
    and lower(coalesce(u.email, '')) <> 'admin@syncops.tech'
    and not exists (
      select 1 from public.organization_members m where m.user_id = u.id
    )
    and not exists (
      select 1 from public.partners p where p.user_id = u.id
    )
    and not exists (
      select 1 from public.marketplace_sellers s where s.user_id = u.id
    )
  `,
  [SPAM_MARKER, BITLY_MARKER]
);

const { rows: after } = await client.query(
  `select count(*)::int as n from auth.users`
);

console.log(
  JSON.stringify(
    {
      ok: true,
      deleted: rowCount,
      authUsersRemaining: after[0].n,
      keptReal: keepRows.length,
    },
    null,
    2
  )
);

await client.end();
