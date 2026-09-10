/**
 * Soft-cancel specific open appointments for Hair & Care (POS picker cleanup).
 * Does NOT delete the organization/store.
 *
 * Targets:
 *  - Zain Iftikhar · ~2026-09-08 17:30 local
 *  - Mr Saqib Sahib · ~2026-10-08 13:30 local (if still open)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, printDbEnvHelp } from "./load-env.mjs";

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  printDbEnvHelp();
  console.error("Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function nameHay(c) {
  return `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim().toLowerCase();
}

function matchesTarget(appt) {
  const n = nameHay(appt.customer);
  const when = new Date(appt.scheduled_at);
  if (Number.isNaN(when.getTime())) return false;

  // Compare in Asia/Karachi (store locale) so POS labels match.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(when);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const ymd = `${get("year")}-${get("month")}-${get("day")}`;
  const hm = `${get("hour")}:${get("minute")}`;

  const isZain =
    n.includes("zain") &&
    (n.includes("iftikhar") || true) &&
    ymd === "2026-09-08" &&
    (hm === "17:30" || hm === "5:30"); // hour12 false → 17:30

  const isSaqib =
    n.includes("saqib") &&
    ymd === "2026-10-08" &&
    (hm === "13:30");

  // Prefer exact time; if name+day unique enough among open appts, still allow name+day.
  if (n.includes("zain") && n.includes("iftikhar") && ymd === "2026-09-08") return true;
  if (n.includes("saqib") && ymd === "2026-10-08") return true;
  return isZain || isSaqib;
}

async function main() {
  const { data: orgs, error: orgErr } = await admin
    .from("organizations")
    .select("id, name, slug")
    .or("name.ilike.%Hair%Care%,slug.eq.hair-care");

  if (orgErr) throw new Error(orgErr.message);
  const org =
    (orgs ?? []).find((o) => /hair\s*&\s*care/i.test(o.name) || o.slug === "hair-care") ??
    (orgs ?? [])[0];

  if (!org) throw new Error('Organization "Hair & Care" not found');
  console.log(`Org: ${org.name} (${org.id}) slug=${org.slug}`);

  const { data: rows, error } = await admin
    .from("appointments")
    .select(
      `
      id,
      scheduled_at,
      status,
      deleted_at,
      customer:customers(first_name, last_name)
    `
    )
    .eq("organization_id", org.id)
    .is("deleted_at", null)
    .not("status", "in", '("COMPLETED","CANCELLED","NO_SHOW")');

  if (error) throw new Error(error.message);

  const targets = (rows ?? []).filter(matchesTarget);
  if (!targets.length) {
    console.log("No matching open appointments found (may already be removed). Listing open appointments:");
    for (const a of rows ?? []) {
      console.log(
        `  - ${a.id} ${a.scheduled_at} ${nameHay(a.customer)} status=${a.status}`
      );
    }
    return;
  }

  const now = new Date().toISOString();
  const ids = targets.map((t) => t.id);

  console.log("Cancelling + soft-deleting:");
  for (const t of targets) {
    console.log(`  - ${t.id} ${t.scheduled_at} ${nameHay(t.customer)}`);
  }

  const { error: updErr } = await admin
    .from("appointments")
    .update({
      status: "CANCELLED",
      deleted_at: now,
      updated_at: now,
    })
    .eq("organization_id", org.id)
    .in("id", ids);

  if (updErr) throw new Error(updErr.message);
  console.log(`✓ Removed ${ids.length} appointment(s) from POS for ${org.name}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
