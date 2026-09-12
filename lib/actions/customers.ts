"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types/commerce";

export type { ActionResult };

const customerSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

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

  const parsed = customerSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // App permission already checked — use admin client so RLS role lists cannot block reception.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert({
      organization_id: org.organizationId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      notes: parsed.data.notes ?? null,
      tags,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

/** Create customer without redirect — for slide-over / modal forms. */
export async function createCustomerInline(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult & { customerId?: string }> {
  const orgOrErr = await requireCustomerAction("customers.create");
  if ("error" in orgOrErr) return { error: orgOrErr.error };
  const org = orgOrErr;

  const parsed = customerSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customers")
    .insert({
      organization_id: org.organizationId,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      notes: parsed.data.notes ?? null,
      tags,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data?.id) return { error: "Could not create customer" };

  revalidatePath("/customers");
  return { success: true, customerId: data.id };
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

  const { data: sales } = await supabase
    .from("sales")
    .select("customer_id, total, completed_at, status")
    .eq("organization_id", org.organizationId)
    .in("status", ["COMPLETED", "AMENDED"])
    .is("deleted_at", null)
    .not("customer_id", "is", null);

  const byCustomer = new Map<
    string,
    { totalSpent: number; visitCount: number; lastVisitAt: string | null }
  >();

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

  const parsed = customerSchema.safeParse({
    first_name: formData.get("first_name"),
    last_name: formData.get("last_name") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    notes: formData.get("notes") || undefined,
    tags: formData.get("tags") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const tags = parsed.data.tags
    ? parsed.data.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .update({
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      notes: parsed.data.notes ?? null,
      tags,
    })
    .eq("id", id)
    .eq("organization_id", org.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
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

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { success: true };
}

export async function getCustomers(search?: string) {
  const org = await requireOrganization();
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("*")
    .eq("organization_id", org.organizationId)
    .is("deleted_at", null)
    .order("first_name");

  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`
    );
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
    .select("*")
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

  const [appointments, sales] = await Promise.all([
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
      .limit(50)
      .then(({ data }) => data ?? []),
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
      .limit(50)
      .then(({ data }) => data ?? []),
  ]);

  const completedSales = sales.filter(
    (s) => s.status === "COMPLETED" || s.status === "AMENDED"
  );
  const totalSpent = completedSales.reduce((sum, s) => sum + Number(s.total), 0);

  return {
    appointments: appointments as unknown as CustomerHistory["appointments"],
    sales: sales as unknown as CustomerHistory["sales"],
    stats: {
      totalSpent,
      visitCount: completedSales.length,
      appointmentCount: appointments.length,
    },
  };
}
