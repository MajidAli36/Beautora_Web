"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { revalidateCustomers } from "@/lib/cache/revalidate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";

export type { ActionResult };

const customerSchema = z.object({
  first_name: z.string().trim().min(1, "First name is required"),
  last_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

function parseCustomerForm(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "").trim();
  return customerSchema.safeParse({
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim() || undefined,
    phone: String(formData.get("phone") ?? "").trim() || undefined,
    email: rawEmail || "",
    notes: String(formData.get("notes") ?? "").trim() || undefined,
    tags: String(formData.get("tags") ?? "").trim() || undefined,
  });
}

async function upsertNormalizedCustomer(input: {
  organizationId: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  tags: string[];
  /** When set, update this row instead of insert/find. */
  existingId?: string;
}): Promise<ActionResult & { customerId?: string }> {
  const {
    normalizeBookingEmail,
    normalizeBookingPhone,
    ensureCustomerFromBooking,
  } = await import("@/lib/customers/ensure-from-booking");

  const phone = normalizeBookingPhone(input.phone ?? null);
  const email = normalizeBookingEmail(input.email || null);
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY — cannot save customers right now.",
    };
  }

  if (input.existingId) {
    const { data: updated, error } = await admin
      .from("customers")
      .update({
        first_name: input.first_name,
        last_name: input.last_name ?? null,
        phone,
        email,
        notes: input.notes ?? null,
        tags: input.tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.existingId)
      .eq("organization_id", input.organizationId)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!updated) return { error: "Customer not found or already deleted" };
    return { success: true, customerId: updated.id };
  }

  // Prefer find/restore so re-adding the same phone/email never “vanishes”.
  const ensured = await ensureCustomerFromBooking(admin, input.organizationId, {
    firstName: input.first_name,
    lastName: input.last_name ?? null,
    phone,
    email,
    notes: input.notes ?? null,
  });
  if ("error" in ensured) return { error: ensured.error };

  // Active match (not newly created / restored) — do not overwrite CRM profile.
  if (!ensured.created) {
    return {
      error:
        "A customer with this phone or email already exists. Open their profile instead of creating a duplicate.",
      customerId: ensured.customerId,
    };
  }

  // New or restored — apply full submitted profile (tags included).
  const { data: updated, error: updateErr } = await admin
    .from("customers")
    .update({
      first_name: input.first_name,
      last_name: input.last_name ?? null,
      phone,
      email,
      notes: input.notes ?? null,
      tags: input.tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ensured.customerId)
    .eq("organization_id", input.organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (updateErr) return { error: updateErr.message };
  if (!updated) {
    return { error: "Customer could not be saved after create/restore" };
  }

  return { success: true, customerId: updated.id };
}

async function requireCustomerAction(action: "customers.create" | "customers.edit" | "customers.delete") {
  try {
    return await requireAction(action);
  } catch {
    const label =
      action === "customers.create"
        ? "create customers"
        : action === "customers.edit"
          ? "edit customers"
          : "delete customers";
    return {
      error: `You don’t have permission to ${label}. Ask an admin to enable this under Staff → Features & actions for your role.`,
    } as const;
  }
}

export async function createCustomer(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgOrErr = await requireCustomerAction("customers.create");
  if ("error" in orgOrErr) return { error: orgOrErr.error };
  const org = orgOrErr;

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const result = await upsertNormalizedCustomer({
    organizationId: org.organizationId,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    notes: parsed.data.notes,
    tags,
  });
  if (result.error || !result.customerId) {
    return { error: result.error ?? "Could not create customer" };
  }

  revalidateCustomers();
  redirect(`/customers/${result.customerId}`);
}

/** Create customer without redirect — for slide-over / modal forms. */
export async function createCustomerInline(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { customerId?: string }> {
  const orgOrErr = await requireCustomerAction("customers.create");
  if ("error" in orgOrErr) return { error: orgOrErr.error };
  const org = orgOrErr;

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const result = await upsertNormalizedCustomer({
    organizationId: org.organizationId,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    notes: parsed.data.notes,
    tags,
  });
  if (result.error || !result.customerId) {
    return { error: result.error ?? "Could not create customer" };
  }

  revalidateCustomers();
  return { success: true, customerId: result.customerId };
}

export type CustomerDirectoryRow = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  tags: string[];
  created_at: string;
  totalSpent: number;
  visitCount: number;
  lastVisitAt: string | null;
};

/** Customers list with spend / last visit for the directory UI. */
export async function getCustomersDirectory(search?: string): Promise<{
  customers: CustomerDirectoryRow[];
  newThisMonth: number;
}> {
  const org = await requireOrganization();
  const supabase = await createClient();
  const customers = await getCustomers(search);

  const customerIds = (customers ?? []).map((c) => c.id);
  const byCustomer = new Map<
    string,
    { totalSpent: number; visitCount: number; lastVisitAt: string | null }
  >();

  if (customerIds.length > 0) {
    const lookback = new Date();
    lookback.setFullYear(lookback.getFullYear() - 2);
    const lookbackIso = lookback.toISOString();

    // Prefer SQL aggregate RPC (one round-trip). Fall back to chunked scans if not migrated yet.
    const { data: rpcRows, error: rpcErr } = await supabase.rpc(
      "customer_directory_stats",
      {
        p_organization_id: org.organizationId,
        p_customer_ids: customerIds,
        p_since: lookbackIso,
      }
    );

    if (!rpcErr && Array.isArray(rpcRows)) {
      for (const row of rpcRows) {
        byCustomer.set(row.customer_id as string, {
          totalSpent: Number(row.total_spent) || 0,
          visitCount: Number(row.visit_count) || 0,
          lastVisitAt: (row.last_visit_at as string | null) ?? null,
        });
      }
    } else {
      const chunks: string[][] = [];
      for (let i = 0; i < customerIds.length; i += 200) {
        chunks.push(customerIds.slice(i, i + 200));
      }
      const salesChunks = await Promise.all(
        chunks.map((chunk) =>
          supabase
            .from("sales")
            .select("customer_id, total, completed_at")
            .eq("organization_id", org.organizationId)
            .in("status", ["COMPLETED", "AMENDED"])
            .is("deleted_at", null)
            .in("customer_id", chunk)
            .gte("completed_at", lookbackIso)
        )
      );
      for (const { data: sales } of salesChunks) {
        for (const sale of sales ?? []) {
          const cid = sale.customer_id as string;
          if (!cid) continue;
          const prev = byCustomer.get(cid) ?? {
            totalSpent: 0,
            visitCount: 0,
            lastVisitAt: null as string | null,
          };
          prev.totalSpent += Number(sale.total) || 0;
          prev.visitCount += 1;
          const completed = sale.completed_at as string | null;
          if (
            completed &&
            (!prev.lastVisitAt || new Date(completed) > new Date(prev.lastVisitAt))
          ) {
            prev.lastVisitAt = completed;
          }
          byCustomer.set(cid, prev);
        }
      }
    }
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const rows: CustomerDirectoryRow[] = (customers ?? []).map((c) => {
    const stats = byCustomer.get(c.id);
    return {
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      email: c.email,
      notes: c.notes,
      tags: c.tags ?? [],
      created_at: c.created_at,
      totalSpent: stats?.totalSpent ?? 0,
      visitCount: stats?.visitCount ?? 0,
      lastVisitAt: stats?.lastVisitAt ?? null,
    };
  });

  const newThisMonth = rows.filter((c) => new Date(c.created_at) >= monthStart).length;

  return { customers: rows, newThisMonth };
}

export async function updateCustomer(
  id: string,
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const orgOrErr = await requireCustomerAction("customers.edit");
  if ("error" in orgOrErr) return { error: orgOrErr.error };
  const org = orgOrErr;

  const parsed = parseCustomerForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const result = await upsertNormalizedCustomer({
    organizationId: org.organizationId,
    existingId: id,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone,
    email: parsed.data.email,
    notes: parsed.data.notes,
    tags,
  });
  if (result.error) return { error: result.error };

  revalidateCustomers(id);
  return { success: true };
}

export async function deleteCustomer(id: string): Promise<ActionResult> {
  const orgOrErr = await requireCustomerAction("customers.delete");
  if ("error" in orgOrErr) return { error: orgOrErr.error };
  const org = orgOrErr;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!customer) return { error: "Customer not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  const result = await softDeleteEntity({
    table: "customers",
    id,
    organizationId: org.organizationId,
    actor,
    action: "customer.delete",
    entityType: "customer",
    summary: `Deleted customer ${name}`,
    before: customer as unknown as Record<string, unknown>,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/customers");
  redirect("/customers");
}

/** Soft-delete without redirect — for list UIs that refresh in place. */
export async function deleteCustomerInline(id: string): Promise<ActionResult> {
  const orgOrErr = await requireCustomerAction("customers.delete");
  if ("error" in orgOrErr) return { error: orgOrErr.error };
  const org = orgOrErr;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!customer) return { error: "Customer not found" };

  const { resolveSoftDeleteActor, softDeleteEntity } = await import("@/lib/db/soft-delete");
  const actor = await resolveSoftDeleteActor();
  const name = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  const result = await softDeleteEntity({
    table: "customers",
    id,
    organizationId: org.organizationId,
    actor,
    action: "customer.delete",
    entityType: "customer",
    summary: `Deleted customer ${name}`,
    before: customer as unknown as Record<string, unknown>,
  });

  if (result.error) return { error: result.error };

  revalidateCustomers(id);
  return { success: true };
}

export async function getCustomers(search?: string) {
  const org = await requireOrganization();
  const supabase = await createClient();
  const {
    normalizeBookingPhone,
    phoneLookupVariants,
  } = await import("@/lib/customers/ensure-from-booking");

  let query = supabase
    .from("customers")
    .select("id, first_name, last_name, phone, email, created_at, notes, tags")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(search?.trim() ? 500 : 300);

  const raw = search?.trim() ?? "";
  if (raw) {
    // Escape commas/% for PostgREST `or` filter values.
    const safe = raw.replace(/[%_,]/g, " ").trim();
    const term = `%${safe}%`;
    const parts = [
      `first_name.ilike.${term}`,
      `last_name.ilike.${term}`,
      `phone.ilike.${term}`,
      `email.ilike.${term}`,
    ];
    const normalized = normalizeBookingPhone(raw);
    if (normalized) {
      for (const variant of phoneLookupVariants(normalized)) {
        parts.push(`phone.eq.${variant}`);
        parts.push(`phone.ilike.%${variant}%`);
      }
    }
    query = query.or(parts.join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getCustomer(id: string) {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, organization_id, first_name, last_name, phone, email, notes, tags, deleted_at, deleted_by, deleted_by_role, created_by, updated_by, created_at, updated_at"
    )
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .single();

  if (error) return null;
  return data;
}

export type CustomerHistory = {
  appointments: {
    id: string;
    scheduled_at: string;
    status: string;
    staff: { full_name: string } | null;
    services: { service_name: string; price: number }[];
  }[];
  sales: {
    id: string;
    total: number;
    status: string;
    completed_at: string | null;
    amount_paid?: number;
    amount_due?: number;
    payment_status?: string;
    invoice: { invoice_number: string } | { invoice_number: string }[] | null;
    items: { name: string; quantity: number; line_total: number }[];
  }[];
  stats: {
    totalSpent: number;
    visitCount: number;
    appointmentCount: number;
  };
};

export async function getCustomerHistory(customerId: string): Promise<CustomerHistory | null> {
  const org = await requireOrganization();
  const supabase = await createClient();

  const customer = await getCustomer(customerId);
  if (!customer) return null;

  const [appointmentsRes, salesRes, apptCountRes, lifetimeRpc] = await Promise.all([
    supabase
      .from("appointments")
      .select(`
        id, scheduled_at, status,
        staff:staff(full_name),
        services:appointment_services(service_name, price)
      `)
      .eq("organization_id", org.organizationId)
      .eq("customer_id", customerId)
      .order("scheduled_at", { ascending: false })
      .limit(50),
    supabase
      .from("sales")
      .select(`
        id, total, status, completed_at, amount_paid, amount_due, payment_status,
        invoice:invoices(invoice_number),
        items:sale_items(name, quantity, line_total)
      `)
      .eq("organization_id", org.organizationId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", org.organizationId)
      .eq("customer_id", customerId),
    supabase.rpc("customer_lifetime_stats", {
      p_organization_id: org.organizationId,
      p_customer_id: customerId,
    }),
  ]);

  const appointments = appointmentsRes.data ?? [];
  const sales = salesRes.data ?? [];

  let totalSpent = 0;
  let visitCount = 0;
  if (!lifetimeRpc.error && Array.isArray(lifetimeRpc.data) && lifetimeRpc.data[0]) {
    totalSpent = Number(lifetimeRpc.data[0].total_spent) || 0;
    visitCount = Number(lifetimeRpc.data[0].visit_count) || 0;
  } else {
    const completed = sales.filter(
      (s) => s.status === "COMPLETED" || s.status === "AMENDED"
    );
    totalSpent = completed.reduce((sum, s) => sum + Number(s.total), 0);
    visitCount = completed.length;
  }

  return {
    appointments: appointments as unknown as CustomerHistory["appointments"],
    sales: sales as unknown as CustomerHistory["sales"],
    stats: {
      totalSpent,
      visitCount,
      appointmentCount: apptCountRes.count ?? appointments.length,
    },
  };
}
