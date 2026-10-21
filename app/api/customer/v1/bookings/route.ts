import {
  jsonError,
  requireLookupPhone,
  resolveCustomerAppRequest,
} from "@/lib/customer-apps/api";
import { createOnlineBooking } from "@/lib/actions/appointments";
import { caAdmin } from "@/lib/customer-apps/admin";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET — list recent appointments for a customer phone within app salon scope.
 * Prefer app-attributed bookings when customer_app_id is set.
 * Query: app, phone (exact normalized match; ≥10 digits required).
 */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);

  const phoneRaw = new URL(request.url).searchParams.get("phone");
  const phoneCheck = requireLookupPhone(phoneRaw);
  if ("error" in phoneCheck) return jsonError(phoneCheck.error, phoneCheck.status);
  const digits = phoneCheck.phone;

  const admin = caAdmin();

  // Prefer app-customer + CUSTOMER_APP attribution (exact phone, not partial).
  const { data: appCustomers } = await admin
    .from("customer_app_customers")
    .select("id")
    .eq("customer_app_id", ctx.app.id)
    .eq("phone", digits)
    .limit(5);

  const appCustomerIds = ((appCustomers ?? []) as { id: string }[]).map((c) => c.id);
  if (appCustomerIds.length) {
    const { data: appBookings } = await admin
      .from("appointments")
      .select(
        "id, organization_id, customer_id, app_customer_id, customer_app_id, staff_id, scheduled_at, duration_minutes, status, source, notes, booking_number, created_at"
      )
      .eq("customer_app_id", ctx.app.id)
      .in("app_customer_id", appCustomerIds)
      .is("deleted_at", null)
      .order("scheduled_at", { ascending: false })
      .limit(50);
    if (appBookings?.length) {
      return NextResponse.json({ bookings: appBookings });
    }
  }

  const { data: customers } = await admin
    .from("customers")
    .select("id")
    .in("organization_id", ctx.organizationIds)
    .eq("phone", digits)
    .is("deleted_at", null)
    .limit(5);

  const customerIds = ((customers ?? []) as { id: string }[]).map((c) => c.id);
  if (!customerIds.length) return NextResponse.json({ bookings: [] });

  const { data: bookings } = await admin
    .from("appointments")
    .select(
      "id, organization_id, customer_id, app_customer_id, customer_app_id, staff_id, scheduled_at, duration_minutes, status, source, notes, booking_number, created_at"
    )
    .in("organization_id", ctx.organizationIds)
    .in("customer_id", customerIds)
    .is("deleted_at", null)
    .order("scheduled_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ bookings: bookings ?? [] });
}

/**
 * POST — create booking via existing online booking engine (shared appointments row).
 * Tags source=CUSTOMER_APP + customer_app_id + app_customer_id.
 */
export async function POST(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);
  if (!ctx.settings.features.online_appointments) {
    return jsonError("Online appointments feature is disabled", 403);
  }

  let body: {
    organizationId?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    scheduledAt?: string;
    staffId?: string;
    serviceIds?: string[];
    notes?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const organizationId = String(body.organizationId ?? "");
  if (!ctx.organizationIds.includes(organizationId)) {
    return jsonError("Salon not assigned to this app", 403);
  }

  const admin = caAdmin();
  const { data: org } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org?.slug) return jsonError("Salon not found", 404);

  const serviceIds = Array.isArray(body.serviceIds)
    ? body.serviceIds.map(String)
    : [];
  if (!body.firstName?.trim() || !body.phone?.trim() || !body.scheduledAt || !body.staffId) {
    return jsonError("firstName, phone, scheduledAt, staffId, serviceIds required", 400);
  }
  if (!serviceIds.length) return jsonError("serviceIds required", 400);

  const { upsertAppCustomer } = await import("@/lib/customer-apps/domain");
  const appCustomer = await upsertAppCustomer({
    customerAppId: ctx.app.id,
    organizationId,
    firstName: body.firstName.trim(),
    lastName: body.lastName?.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim(),
  });

  const result = await createOnlineBooking({
    orgSlug: org.slug as string,
    firstName: body.firstName.trim(),
    lastName: body.lastName?.trim(),
    phone: body.phone.trim(),
    email: body.email?.trim(),
    scheduledAt: body.scheduledAt,
    staffId: body.staffId,
    serviceIds,
    notes: body.notes?.trim(),
    customerAppId: ctx.app.id,
    appCustomerId: appCustomer.id,
  });

  if (result.error) return jsonError(result.error, 400);
  return NextResponse.json({ ok: true, appCustomerId: appCustomer.id, ...result });
}
