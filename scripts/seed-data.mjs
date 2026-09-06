import { createClient } from "@supabase/supabase-js";
import { loadEnvLocal, getDatabaseUrl, printDbEnvHelp } from "./load-env.mjs";
import { runSqlFile } from "./run-sql.mjs";

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = getDatabaseUrl(env);

const OWNER_EMAIL = "owner@salon.com";
const OWNER_PASSWORD = "Salon123!";
const ORG_SLUG = "hair-salon";

async function seedViaSql() {
  if (!dbUrl) {
    printDbEnvHelp();
    process.exit(1);
  }
  console.log("Seeding via SQL (supabase/seed.sql)…");
  await runSqlFile(dbUrl, "supabase/seed.sql");
}

async function seedViaAdminApi() {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function getOrCreateOwner() {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === OWNER_EMAIL);
    if (existing) {
      console.log(`User already exists: ${OWNER_EMAIL}`);
      await admin.auth.admin.updateUserById(existing.id, {
        password: OWNER_PASSWORD,
        email_confirm: true,
      });
      return existing.id;
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`Create user failed: ${error.message}`);
    console.log(`Created user: ${OWNER_EMAIL}`);
    return data.user.id;
  }

  const DEMO_STORES = [
    {
      name: "Hair & Care Salon",
      slug: ORG_SLUG,
      attachOwner: true,
      services: [
        { category: "Hair", name: "Haircut", price: 1500, duration_minutes: 45 },
        { category: "Hair", name: "Hair Color", price: 4500, duration_minutes: 120 },
        { category: "Nails", name: "Manicure", price: 1200, duration_minutes: 40 },
      ],
      staff: [{ full_name: "Ayesha Khan", job_title: "Senior Stylist", pin_code: "1234", phone: "+923001234567" }],
    },
    {
      name: "Luxe Cuts Studio",
      slug: "luxe-cuts",
      attachOwner: false,
      services: [
        { category: "Hair", name: "Signature Cut", price: 2200, duration_minutes: 50 },
        { category: "Hair", name: "Blow Dry", price: 1800, duration_minutes: 40 },
      ],
      staff: [{ full_name: "Bilal Raza", job_title: "Stylist", pin_code: "2345", phone: "+923001112233" }],
    },
    {
      name: "Bloom Beauty Bar",
      slug: "bloom-beauty",
      attachOwner: false,
      services: [
        { category: "Beauty", name: "Facial Glow", price: 3500, duration_minutes: 60 },
        { category: "Nails", name: "Gel Manicure", price: 2500, duration_minutes: 55 },
      ],
      staff: [{ full_name: "Hina Malik", job_title: "Beauty Artist", pin_code: "3456", phone: "+923004445566" }],
    },
  ];

  async function seedOrganization(ownerId, store) {
    let orgId;
    const { data: existingOrg } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", store.slug)
      .maybeSingle();

    if (existingOrg) {
      orgId = existingOrg.id;
      await admin.from("organizations").update({ name: store.name }).eq("id", orgId);
    } else {
      const { data, error } = await admin
        .from("organizations")
        .insert({ name: store.name, slug: store.slug })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      orgId = data.id;
    }

    if (store.attachOwner) {
      const { data: member } = await admin
        .from("organization_members")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", ownerId)
        .maybeSingle();

      if (!member) {
        const { error } = await admin.from("organization_members").insert({
          organization_id: orgId,
          user_id: ownerId,
          role: "OWNER",
        });
        if (error) throw new Error(error.message);
      }
    }

    const { count } = await admin
      .from("services")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId);

    if (!count) {
      const categoryNames = [...new Set(store.services.map((s) => s.category))];
      const { data: cats } = await admin
        .from("service_categories")
        .insert(
          categoryNames.map((name, index) => ({
            organization_id: orgId,
            name,
            sort_order: index + 1,
          }))
        )
        .select("id, name");

      const categoryIdByName = Object.fromEntries((cats ?? []).map((c) => [c.name, c.id]));

      await admin.from("services").insert(
        store.services.map((s) => ({
          organization_id: orgId,
          category_id: categoryIdByName[s.category] ?? null,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
        }))
      );
      await admin.from("staff").insert(
        store.staff.map((s) => ({
          organization_id: orgId,
          ...s,
          online_booking_enabled: true,
          is_active: true,
        }))
      );

      if (store.attachOwner) {
        await admin.from("customers").insert([
          {
            organization_id: orgId,
            first_name: "Sara",
            last_name: "Ahmed",
            phone: "+923009876543",
            email: "sara@example.com",
            tags: ["VIP"],
          },
        ]);
      }
    }

    console.log(`  Store ready: ${store.name} (/book/${store.slug})`);
  }

  const ownerId = await getOrCreateOwner();
  for (const store of DEMO_STORES) {
    await seedOrganization(ownerId, store);
  }
}

async function main() {
  console.log("\n=== Salon seed ===\n");

  if (serviceKey && url) {
    try {
      await seedViaAdminApi();
    } catch (err) {
      console.warn("Admin API seed failed:", err.message);
      console.log("Trying SQL seed instead…\n");
      await seedViaSql();
    }
  } else {
    await seedViaSql();
  }

  console.log("\n✓ Seed complete\n");
  console.log("Login at http://localhost:3000/login");
  console.log(`  Email:    ${OWNER_EMAIL}`);
  console.log(`  Password: ${OWNER_PASSWORD}`);
  console.log(`\nOnline booking: http://localhost:3000/book/${ORG_SLUG}\n`);
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  if (err.message.includes("relation") || err.message.includes("does not exist")) {
    console.error("\nRun migrations first: npm run db:push\n");
  }
  process.exit(1);
});
