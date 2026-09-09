"use server";

import { revalidatePath } from "next/cache";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization, getActiveOrganization } from "@/lib/auth/organization";
import { hasMinimumRole } from "@/lib/permissions/roles";
import {
  isPlatformAdminEmail,
  resolveSubscription,
  SUBSCRIPTION,
  type SubscriptionSnapshot,
} from "@/lib/billing/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getSubscriptionInvoiceSignedUrl,
  uploadSubscriptionInvoice,
} from "@/lib/storage/subscription-invoices";
import type { ActionResult } from "@/types/commerce";

const MAX_INVOICE_BYTES = 5 * 1024 * 1024;
const ALLOWED_INVOICE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export type BillingPaymentRow = {
  id: string;
  amount: number;
  transaction_ref: string;
  payer_name: string | null;
  notes: string | null;
  status: "pending" | "approved" | "rejected";
  jazzcash_number: string;
  created_at: string;
  reviewed_at: string | null;
  review_notes: string | null;
  has_invoice: boolean;
  invoice_mime: string | null;
  organization_id?: string;
  organization_name?: string;
  organization_slug?: string;
  organization_city?: string | null;
};

function invoiceExtension(mime: string): string | null {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/jpeg") return "jpg";
  return null;
}

export async function getOrganizationSubscription(): Promise<{
  orgId: string;
  orgName: string;
  snapshot: SubscriptionSnapshot;
} | null> {
  const org = await getActiveOrganization();
  if (!org) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("organizations")
    .select(
      "id, name, trial_ends_at, subscription_ends_at, subscription_locked_at, subscription_status, admin_disabled_at, created_at"
    )
    .eq("id", org.organizationId)
    .single();

  if (!data) return null;

  // Persist locked status when grace has ended
  const snapshot = resolveSubscription(data);
  if (snapshot.phase === "locked" && !data.subscription_locked_at) {
    await admin
      .from("organizations")
      .update({
        subscription_status: "locked",
        subscription_locked_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  } else if (snapshot.phase === "grace" && data.subscription_status !== "grace") {
    await admin
      .from("organizations")
      .update({ subscription_status: "grace" })
      .eq("id", data.id);
  }

  return {
    orgId: data.id,
    orgName: data.name,
    snapshot: resolveSubscription(data),
  };
}

export async function listMySubscriptionPayments(): Promise<BillingPaymentRow[]> {
  const org = await requireOrganization();
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_payments")
    .select(
      "id, amount, transaction_ref, payer_name, notes, status, jazzcash_number, created_at, reviewed_at, review_notes, invoice_path, invoice_mime"
    )
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    transaction_ref: row.transaction_ref,
    payer_name: row.payer_name,
    notes: row.notes,
    status: row.status as BillingPaymentRow["status"],
    jazzcash_number: row.jazzcash_number,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_notes,
    has_invoice: Boolean(row.invoice_path),
    invoice_mime: (row as { invoice_mime?: string | null }).invoice_mime ?? null,
  }));
}

export async function submitSubscriptionPayment(input: {
  transactionRef: string;
  payerName?: string;
  notes?: string;
  invoice: File;
}): Promise<ActionResult> {
  const org = await requireAction("billing.manage");
  const ref = input.transactionRef.trim();
  if (ref.length < 4) {
    return { error: "Enter your JazzCash transaction / reference ID" };
  }

  const invoice = input.invoice;
  if (!invoice || !(invoice instanceof File) || invoice.size === 0) {
    return { error: "Upload your JazzCash invoice / payment screenshot" };
  }
  if (invoice.size > MAX_INVOICE_BYTES) {
    return { error: "Invoice must be 5 MB or smaller" };
  }
  const mime = invoice.type || "";
  if (!ALLOWED_INVOICE_TYPES.has(mime)) {
    return { error: "Invoice must be JPG, PNG, WebP, or PDF" };
  }
  const extension = invoiceExtension(mime);
  if (!extension) {
    return { error: "Unsupported invoice file type" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: pending } = await supabase
    .from("subscription_payments")
    .select("id")
    .eq("organization_id", org.organizationId)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pending) {
    return { error: "You already have a pending payment under review." };
  }

  const { data: created, error } = await supabase
    .from("subscription_payments")
    .insert({
      organization_id: org.organizationId,
      amount: SUBSCRIPTION.monthlyAmountPkr,
      currency: "PKR",
      jazzcash_number: SUBSCRIPTION.jazzcashNumber,
      transaction_ref: ref,
      payer_name: input.payerName?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "pending",
      submitted_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Could not submit payment" };

  const bytes = Buffer.from(await invoice.arrayBuffer());
  const uploaded = await uploadSubscriptionInvoice({
    organizationId: org.organizationId,
    paymentId: created.id,
    bytes,
    contentType: mime,
    extension,
  });

  if (!uploaded.ok) {
    await createAdminClient().from("subscription_payments").delete().eq("id", created.id);
    return { error: uploaded.error };
  }

  const { error: pathErr } = await createAdminClient()
    .from("subscription_payments")
    .update({
      invoice_path: uploaded.result.path,
      invoice_mime: mime,
    })
    .eq("id", created.id);

  if (pathErr) {
    return { error: pathErr.message };
  }

  revalidatePath("/billing");
  revalidatePath("/platform/subscriptions");
  return { success: true };
}

/** Signed URL for owner/admin of the store, or Beautora platform admin. */
export async function getSubscriptionInvoiceUrl(
  paymentId: string
): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("subscription_payments")
    .select("id, organization_id, invoice_path")
    .eq("id", paymentId)
    .maybeSingle();

  if (!payment?.invoice_path) {
    return { error: "No invoice uploaded for this payment" };
  }

  const isPlatform = isPlatformAdminEmail(user.email);
  if (!isPlatform) {
    const org = await getActiveOrganization();
    if (
      !org ||
      org.organizationId !== payment.organization_id ||
      !hasMinimumRole(org.role, "ADMIN")
    ) {
      return { error: "Not allowed to view this invoice" };
    }
  }

  return getSubscriptionInvoiceSignedUrl(payment.invoice_path);
}

export async function listPendingPlatformPayments(): Promise<BillingPaymentRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isPlatformAdminEmail(user?.email)) {
    return [];
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscription_payments")
    .select(
      "id, organization_id, amount, transaction_ref, payer_name, notes, status, jazzcash_number, created_at, reviewed_at, review_notes, invoice_path, invoice_mime, organization:organizations(name, slug, city)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => {
    const org = row.organization as { name?: string; slug?: string; city?: string | null } | null;
    return {
      id: row.id,
      amount: Number(row.amount),
      transaction_ref: row.transaction_ref,
      payer_name: row.payer_name,
      notes: row.notes,
      status: row.status as BillingPaymentRow["status"],
      jazzcash_number: row.jazzcash_number,
      created_at: row.created_at,
      reviewed_at: row.reviewed_at,
      review_notes: row.review_notes,
      has_invoice: Boolean(row.invoice_path),
      invoice_mime: row.invoice_mime ?? null,
      organization_id: row.organization_id,
      organization_name: org?.name ?? "Store",
      organization_slug: org?.slug,
      organization_city: org?.city ?? null,
    };
  });
}

export async function reviewSubscriptionPayment(input: {
  paymentId: string;
  decision: "approved" | "rejected";
  reviewNotes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isPlatformAdminEmail(user.email)) {
    return { error: "Only Beautora platform admins can approve payments" };
  }

  const admin = createAdminClient();
  const { data: payment, error } = await admin
    .from("subscription_payments")
    .select("id, organization_id, status, amount")
    .eq("id", input.paymentId)
    .single();

  if (error || !payment) return { error: "Payment not found" };
  if (payment.status !== "pending") return { error: "Payment already reviewed" };

  if (input.decision === "rejected") {
    const { error: upd } = await admin
      .from("subscription_payments")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: input.reviewNotes?.trim() || null,
      })
      .eq("id", payment.id);
    if (upd) return { error: upd.message };
    revalidatePath("/platform/subscriptions");
    revalidatePath("/billing");
    return { success: true };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("id, subscription_ends_at, trial_ends_at")
    .eq("id", payment.organization_id)
    .single();

  if (!org) return { error: "Organization not found" };

  const now = new Date();
  const currentEnd = org.subscription_ends_at
    ? new Date(org.subscription_ends_at)
    : null;
  const base =
    currentEnd && currentEnd > now
      ? currentEnd
      : now;
  const nextEnd = new Date(base.getTime());
  nextEnd.setUTCDate(nextEnd.getUTCDate() + 30);

  const { error: payUpd } = await admin
    .from("subscription_payments")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: now.toISOString(),
      review_notes: input.reviewNotes?.trim() || "Approved — store re-enabled for 30 days",
    })
    .eq("id", payment.id);

  if (payUpd) return { error: payUpd.message };

  const { error: orgUpd } = await admin
    .from("organizations")
    .update({
      subscription_ends_at: nextEnd.toISOString(),
      subscription_status: "active",
      subscription_locked_at: null,
    })
    .eq("id", org.id);

  if (orgUpd) return { error: orgUpd.message };

  // First approved subscription for a referred store → full amount to partner
  try {
    const { creditPartnerFirstSubscription } = await import("@/lib/actions/partners");
    await creditPartnerFirstSubscription({
      organizationId: org.id,
      paymentId: payment.id,
      amountPkr: Number(payment.amount),
    });
  } catch (err) {
    console.error("partner commission failed", err);
  }

  try {
    const { sendSubscriptionActivatedEmail } = await import("@/lib/email/notify");
    await sendSubscriptionActivatedEmail({
      organizationId: org.id,
      paymentId: payment.id,
      amount: Number(payment.amount),
      renewsAt: nextEnd.toISOString(),
    });
  } catch (err) {
    console.error("[billing] subscription activated email failed", err);
  }

  revalidatePath("/platform/subscriptions");
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPlatformAdminFlag(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isPlatformAdminEmail(user?.email);
}
