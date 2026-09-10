/**
 * Import salon-schema-and-data.sql into the Hair & Care store (slug=hair-care).
 * - Remaps organization_id to the target org
 * - Skips organization_members (auth users differ)
 * - Maps products.usage_kind → product_kind (SALON → IN_HOUSE)
 * - Remaps auth.user FK columns to the store ADMIN user
 * Only inserts columns that exist on the target tables.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { loadEnvLocal, getDatabaseUrl, printDbEnvHelp } from "./load-env.mjs";
import { createPgClient } from "./run-sql.mjs";

const EXPORT_PATH =
  "d:/Projects/Saloon/data-migration/exports/2026-09-09T21-15-25-210Z/salon-schema-and-data.sql";
const TARGET_SLUG = "hair-care";
const ADMIN_EMAIL = "moizraza547m@gmail.com";
const SOURCE_ORG_ID = "27eb4d76-bbd4-4e84-a409-20875af0ef77";

const SOURCE_AUTH_USER_IDS = [
  "021b920b-d985-49ec-b1db-667ff21f10cc",
  "488f1352-6f34-4957-8269-f993e6f44e91",
  "53754b64-d1c3-4cd5-af6d-1efb89efc32a",
  "681bb361-053f-415f-9021-d10ffe3beb5a",
  "a3664e13-b6ee-47c7-ba45-f26177ca1c33",
  "1df254ad-a05e-4fae-84f1-b4e227612a08",
];

const AUTH_FK_COLUMNS = new Set([
  "created_by",
  "updated_by",
  "deleted_by",
  "voided_by",
  "last_amended_by",
  "approved_by",
  "refunded_by",
  "user_id",
]);

/** Tables to import in FK-safe order. organization_members intentionally omitted. */
const LOAD_ORDER = [
  "customers",
  "service_categories",
  "services",
  "product_categories",
  "products",
  "staff",
  "chairs",
  "staff_attendance",
  "appointments",
  "appointment_services",
  "sales",
  "sale_items",
  "sale_staff",
  "sale_refunds",
  "appointment_deposits",
  "invoices",
  "payments",
  "audit_logs",
];

const USAGE_KIND_MAP = {
  SALON: "IN_HOUSE",
  RETAIL: "RETAIL",
  BOTH: "BOTH",
};

function parseSqlValue(raw) {
  const s = raw.trim();
  if (s === "NULL") return null;
  if (s === "TRUE") return true;
  if (s === "FALSE") return false;
  if (s.startsWith("'") && s.endsWith("'")) {
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith("ARRAY[")) {
    const inner = s.slice(6, -1).trim();
    if (!inner) return [];
    return splitSqlList(inner).map((part) => {
      const p = part.trim();
      if (p.startsWith("'") && p.endsWith("'")) return p.slice(1, -1).replace(/''/g, "'");
      return p;
    });
  }
  if (s.endsWith("::jsonb") || s.endsWith("::json")) {
    const lit = s.replace(/::jsonb?$/, "").trim();
    if (lit.startsWith("'") && lit.endsWith("'")) {
      return JSON.parse(lit.slice(1, -1).replace(/''/g, "'"));
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(s)) return s.includes(".") ? s : Number(s);
  return s;
}

function splitSqlList(input) {
  const parts = [];
  let cur = "";
  let inStr = false;
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inStr) {
      cur += ch;
      if (ch === "'" && input[i + 1] === "'") {
        cur += input[++i];
        continue;
      }
      if (ch === "'") inStr = false;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += ch;
      continue;
    }
    if (ch === "[" || ch === "(") {
      depth++;
      cur += ch;
      continue;
    }
    if (ch === "]" || ch === ")") {
      depth--;
      cur += ch;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function extractInserts(sql) {
  const inserts = new Map();
  const re =
    /INSERT INTO public\."([^"]+)"\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);/gi;
  let m;
  while ((m = re.exec(sql))) {
    const table = m[1];
    const columns = splitSqlList(m[2]).map((c) => c.trim().replace(/^"|"$/g, ""));
    const valuesBlob = m[3].trim();
    const rows = [];
    // Split top-level (...), (...)
    let depth = 0;
    let inStr = false;
    let start = -1;
    for (let i = 0; i < valuesBlob.length; i++) {
      const ch = valuesBlob[i];
      if (inStr) {
        if (ch === "'" && valuesBlob[i + 1] === "'") {
          i++;
          continue;
        }
        if (ch === "'") inStr = false;
        continue;
      }
      if (ch === "'") {
        inStr = true;
        continue;
      }
      if (ch === "(") {
        if (depth === 0) start = i + 1;
        depth++;
        continue;
      }
      if (ch === ")") {
        depth--;
        if (depth === 0 && start >= 0) {
          const tuple = valuesBlob.slice(start, i);
          const vals = splitSqlList(tuple).map(parseSqlValue);
          const row = {};
          columns.forEach((col, idx) => {
            row[col] = vals[idx];
          });
          rows.push(row);
          start = -1;
        }
      }
    }
    inserts.set(table, { columns, rows });
  }
  return inserts;
}

async function getTargetColumns(client, table) {
  const { rows } = await client.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public' and table_name = $1`,
    [table]
  );
  return new Set(rows.map((r) => r.column_name));
}

function transformRow(table, row, { targetOrgId, adminUserId }) {
  const out = { ...row };

  if ("organization_id" in out) out.organization_id = targetOrgId;

  if (table === "products") {
    if ("usage_kind" in out) {
      const mapped = USAGE_KIND_MAP[out.usage_kind] ?? "RETAIL";
      out.product_kind = mapped;
      delete out.usage_kind;
    }
  }

  for (const col of AUTH_FK_COLUMNS) {
    if (!(col in out)) continue;
    if (out[col] == null) continue;
    // organization_members.user_id not imported; for other tables remap
    if (SOURCE_AUTH_USER_IDS.includes(out[col]) || typeof out[col] === "string") {
      out[col] = adminUserId;
    }
  }

  return out;
}

async function upsertRows(client, table, rows, targetCols) {
  if (!rows.length) return 0;
  let inserted = 0;
  const chunkSize = 50;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    for (const row of chunk) {
      const filtered = {};
      for (const [k, v] of Object.entries(row)) {
        if (targetCols.has(k)) filtered[k] = v;
      }
      const cols = Object.keys(filtered);
      if (!cols.length) continue;
      const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(", ");
      const updates = cols
        .filter((c) => c !== "id")
        .map((c) => `"${c}" = EXCLUDED."${c}"`)
        .join(", ");
      const sql = updates
        ? `insert into public."${table}" (${cols.map((c) => `"${c}"`).join(", ")})
           values (${placeholders})
           on conflict (id) do update set ${updates}`
        : `insert into public."${table}" (${cols.map((c) => `"${c}"`).join(", ")})
           values (${placeholders})
           on conflict (id) do nothing`;
      await client.query(sql, cols.map((c) => filtered[c]));
      inserted++;
    }
  }
  return inserted;
}

async function upsertSaleStaff(client, rows, targetOrgId, targetCols) {
  // sale_staff PK is (sale_id, staff_id) — no single id column
  let n = 0;
  for (const row of rows) {
    const filtered = {
      sale_id: row.sale_id,
      staff_id: row.staff_id,
      organization_id: targetOrgId,
      created_at: row.created_at,
    };
    const cols = Object.keys(filtered).filter((c) => targetCols.has(c));
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    await client.query(
      `insert into public.sale_staff (${cols.map((c) => `"${c}"`).join(", ")})
       values (${placeholders})
       on conflict (sale_id, staff_id) do update set organization_id = EXCLUDED.organization_id`,
      cols.map((c) => filtered[c])
    );
    n++;
  }
  return n;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const dbUrl = getDatabaseUrl(env);

  if (!url || !serviceKey) {
    console.error("Missing Supabase URL / service role key");
    process.exit(1);
  }
  if (!dbUrl) {
    printDbEnvHelp();
    process.exit(1);
  }

  console.log("\n=== Import Hair & Care export data ===\n");
  console.log(`Source: ${EXPORT_PATH}`);

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", TARGET_SLUG)
    .maybeSingle();
  if (orgErr) throw new Error(orgErr.message);
  if (!org) throw new Error(`Organization slug=${TARGET_SLUG} not found`);
  console.log(`Target org: ${org.name} (${org.id})`);

  // Find admin user
  let adminUserId = null;
  let page = 1;
  while (!adminUserId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL);
    if (hit) adminUserId = hit.id;
    if (users.length < 200) break;
    page++;
  }
  if (!adminUserId) throw new Error(`Admin user ${ADMIN_EMAIL} not found`);
  console.log(`Auth remap → ADMIN ${ADMIN_EMAIL} (${adminUserId})`);

  const sqlText = readFileSync(EXPORT_PATH, "utf8");
  const inserts = extractInserts(sqlText);
  console.log(`Parsed INSERT tables: ${[...inserts.keys()].join(", ")}`);

  const sourceOrg = inserts.get("organizations")?.rows?.[0];
  if (!sourceOrg) throw new Error("No organizations row in export");
  if (sourceOrg.id !== SOURCE_ORG_ID) {
    console.warn(`Unexpected source org id ${sourceOrg.id}`);
  }

  const client = await createPgClient(dbUrl);
  await client.connect();

  try {
    await client.query("begin");

    // Update org profile fields that exist + match export (keep name/slug of Hair & Care)
    const orgCols = await getTargetColumns(client, "organizations");
    const orgUpdate = {
      whatsapp_phone: sourceOrg.whatsapp_phone,
      nav_permissions: sourceOrg.nav_permissions,
      booking_slot_minutes: sourceOrg.booking_slot_minutes,
      booking_days_ahead: sourceOrg.booking_days_ahead,
      booking_advance_amount: sourceOrg.booking_advance_amount,
      booking_advance_percent: sourceOrg.booking_advance_percent,
      booking_payment_instructions: sourceOrg.booking_payment_instructions,
      city: "Gujranwala",
      country: "Pakistan",
      phone: sourceOrg.whatsapp_phone,
      updated_at: new Date().toISOString(),
    };
    const setParts = [];
    const vals = [];
    for (const [k, v] of Object.entries(orgUpdate)) {
      if (!orgCols.has(k)) continue;
      vals.push(v);
      setParts.push(`"${k}" = $${vals.length}`);
    }
    vals.push(org.id);
    await client.query(
      `update public.organizations set ${setParts.join(", ")} where id = $${vals.length}`,
      vals
    );
    console.log("✓ organizations profile fields updated from export");

    for (const table of LOAD_ORDER) {
      const pack = inserts.get(table);
      if (!pack?.rows?.length) {
        console.log(`· ${table}: 0 rows (skip)`);
        continue;
      }
      const targetCols = await getTargetColumns(client, table);
      if (!targetCols.size) {
        console.log(`· ${table}: target table missing (skip)`);
        continue;
      }

      const transformed = pack.rows.map((r) =>
        transformRow(table, r, { targetOrgId: org.id, adminUserId })
      );

      let count;
      if (table === "sale_staff") {
        count = await upsertSaleStaff(client, transformed, org.id, targetCols);
      } else {
        count = await upsertRows(client, table, transformed, targetCols);
      }
      console.log(`✓ ${table}: ${count} rows`);
    }

    await client.query("commit");
    console.log("\n✓ Import committed into Hair & Care\n");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nImport failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
