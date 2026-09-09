/**
 * Full wipe for clean live testing.
 * KEEP: platform admin only (admin@syncops.tech)
 * REMOVE: all organizations, partners, salon data, and every other auth user.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadEnvLocal, getDatabaseUrl, getProjectRef, printDbEnvHelp } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlFile = resolve(__dirname, "../supabase/reset-business-data.sql");
const KEEP_EMAIL = "admin@syncops.tech";

const env = loadEnvLocal();
const dbUrl = getDatabaseUrl(env);
const ref = getProjectRef(env);

if (!dbUrl) {
  printDbEnvHelp();
  process.exit(1);
}

const parsed = new URL(dbUrl);
const password = decodeURIComponent(parsed.password);
const poolUser = parsed.username.includes(".")
  ? decodeURIComponent(parsed.username)
  : `postgres.${ref}`;

const client = new pg.Client({
  host: parsed.hostname.includes("pooler")
    ? parsed.hostname
    : "aws-0-ap-northeast-2.pooler.supabase.com",
  port: parsed.hostname.includes("pooler") ? Number(parsed.port || 6543) : 6543,
  user: poolUser,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log(
  `Connected to project ${ref} — wiping ALL data (keeping only ${KEEP_EMAIL})…`
);
await client.query(readFileSync(sqlFile, "utf8"));

const { rows } = await client.query(
  `
  select
    (select count(*)::int from auth.users) as users,
    (select coalesce(string_agg(email, ', ' order by email), '') from auth.users) as user_emails,
    (select count(*)::int from public.organizations) as orgs,
    (select count(*)::int from public.organization_members) as members,
    (select count(*)::int from public.partners) as partners,
    (select count(*)::int from public.customers) as customers,
    (select count(*)::int from public.services) as services,
    (select count(*)::int from public.sales) as sales,
    (select count(*)::int from public.appointments) as appointments,
    (select count(*)::int from public.staff) as staff
`
);

console.log("After wipe:", rows[0]);

const emails = String(rows[0]?.user_emails || "");
const userCount = Number(rows[0]?.users || 0);
if (userCount !== 1 || !emails.toLowerCase().includes(KEEP_EMAIL)) {
  console.warn(
    `⚠ Expected only ${KEEP_EMAIL}. Got ${userCount} user(s): ${emails || "(none)"}`
  );
  console.warn(
    "If the platform admin is missing, sign in once at /platform — it will recreate the admin."
  );
} else {
  console.log(`✓ Kept platform admin only: ${KEEP_EMAIL}`);
}

await client.end();
console.log("✓ Done. Live DB is empty — retest signup / partner flows from scratch.");
