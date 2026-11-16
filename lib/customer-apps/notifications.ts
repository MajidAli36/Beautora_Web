import { caAdmin } from "@/lib/customer-apps/admin";
import { getLoyaltyRules } from "@/lib/customer-apps/engagement";
import { listPointTypes } from "@/lib/customer-apps/domain";
import type { CustomerAppSettings } from "@/lib/customer-apps/types";

export type CustomerAppNotification = {
  id: string;
  customer_app_id: string;
  organization_id: string;
  title: string;
  body: string;
  kind: "announcement" | "promo" | "rules" | "reminder";
  is_published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  createdAt: string;
  source: "salon" | "system";
};

export async function listNotificationsForApp(
  customerAppId: string,
  opts?: { publishedOnly?: boolean }
): Promise<CustomerAppNotification[]> {
  const admin = caAdmin();
  let q = admin
    .from("customer_app_notifications")
    .select(
      "id, customer_app_id, organization_id, title, body, kind, is_published, published_at, expires_at, created_at, updated_at"
    )
    .eq("customer_app_id", customerAppId)
    .order("created_at", { ascending: false });
  if (opts?.publishedOnly) {
    q = q.eq("is_published", true);
  }
  const { data, error } = await q;
  if (error) {
    // Table may not be migrated yet — fail soft for public API / dashboard
    const msg = error.message || "";
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      msg.includes("does not exist") ||
      msg.includes("Could not find the table")
    ) {
      return [];
    }
    throw new Error(error.message);
  }
  const now = Date.now();
  return ((data ?? []) as CustomerAppNotification[]).filter((n) => {
    if (!opts?.publishedOnly) return true;
    if (n.expires_at && new Date(n.expires_at).getTime() < now) return false;
    return true;
  });
}

export async function createNotification(input: {
  customerAppId: string;
  organizationId: string;
  actorUserId: string;
  title: string;
  body: string;
  kind?: CustomerAppNotification["kind"];
  publish?: boolean;
}): Promise<CustomerAppNotification> {
  const admin = caAdmin();
  const publish = Boolean(input.publish);
  const { data, error } = await admin
    .from("customer_app_notifications")
    .insert({
      customer_app_id: input.customerAppId,
      organization_id: input.organizationId,
      title: input.title.trim(),
      body: input.body.trim(),
      kind: input.kind || "announcement",
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      created_by: input.actorUserId,
    })
    .select(
      "id, customer_app_id, organization_id, title, body, kind, is_published, published_at, expires_at, created_at, updated_at"
    )
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerAppNotification;
}

export async function setNotificationPublished(
  customerAppId: string,
  notificationId: string,
  published: boolean
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_notifications")
    .update({
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq("id", notificationId)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

export async function deleteNotification(
  customerAppId: string,
  notificationId: string
): Promise<void> {
  const admin = caAdmin();
  const { error } = await admin
    .from("customer_app_notifications")
    .delete()
    .eq("id", notificationId)
    .eq("customer_app_id", customerAppId);
  if (error) throw new Error(error.message);
}

/** Build customer-facing rules text from backend loyalty settings. */
export function formatLoyaltyRulesText(
  rules: Awaited<ReturnType<typeof getLoyaltyRules>>,
  pointTypes: { name: string; earn_hint: string; description?: string }[]
): string {
  const lines: string[] = [];
  if (rules.rules_note?.trim()) {
    lines.push(rules.rules_note.trim());
    lines.push("");
  }
  lines.push("How to earn points:");
  if (rules.welcome_bonus_points > 0) {
    lines.push(`• Welcome bonus: ${rules.welcome_bonus_points} points`);
  }
  if (rules.points_per_completed_booking > 0) {
    lines.push(
      `• Completed booking: ${rules.points_per_completed_booking} points`
    );
  }
  if (rules.points_per_product_purchase > 0) {
    lines.push(
      `• Product purchase: ${rules.points_per_product_purchase} points`
    );
  }
  if (rules.points_per_currency > 0) {
    lines.push(
      `• Spending: ${rules.points_per_currency} point(s) per currency unit`
    );
  }
  for (const t of pointTypes) {
    const hint = t.earn_hint?.trim() || t.description?.trim();
    if (hint) lines.push(`• ${t.name}: ${hint}`);
  }
  lines.push("");
  lines.push("How to redeem:");
  lines.push(`• Minimum redeem: ${rules.min_redeem_points} points`);
  if (rules.redeem_points_per_currency > 0) {
    lines.push(
      `• ${rules.redeem_points_per_currency} points ≈ 1 currency unit off`
    );
  }
  lines.push("• Show your virtual card QR at the salon desk to redeem.");
  if (rules.expiry_days) {
    lines.push(`• Points expire after ${rules.expiry_days} days.`);
  }
  return lines.join("\n").trim();
}

/**
 * Public inbox: salon announcements + auto rules / welcome / deals summaries.
 */
export async function buildPublicNotifications(input: {
  customerAppId: string;
  settings: CustomerAppSettings;
}): Promise<PublicNotification[]> {
  const items: PublicNotification[] = [];
  const salonNotes = await listNotificationsForApp(input.customerAppId, {
    publishedOnly: true,
  });
  for (const n of salonNotes) {
    items.push({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      createdAt: n.published_at || n.created_at,
      source: "salon",
    });
  }

  const experience = input.settings.experience;
  if (experience.welcomeMessage?.trim()) {
    items.push({
      id: "system-welcome",
      title: "Welcome",
      body: experience.welcomeMessage.trim(),
      kind: "announcement",
      createdAt: new Date(0).toISOString(),
      source: "system",
    });
  }
  if (experience.bookingInstructions?.trim()) {
    items.push({
      id: "system-booking",
      title: "How to book",
      body: experience.bookingInstructions.trim(),
      kind: "reminder",
      createdAt: new Date(0).toISOString(),
      source: "system",
    });
  }
  if (experience.cancellationPolicy?.trim()) {
    items.push({
      id: "system-cancel",
      title: "Cancellation policy",
      body: experience.cancellationPolicy.trim(),
      kind: "rules",
      createdAt: new Date(0).toISOString(),
      source: "system",
    });
  }

  const loyalty = await getLoyaltyRules(input.customerAppId);
  if (loyalty.enabled && loyalty.show_on_customer_app) {
    const types = await listPointTypes(input.customerAppId, true);
    items.push({
      id: "system-loyalty-rules",
      title: "How to earn & redeem points",
      body: formatLoyaltyRulesText(loyalty, types),
      kind: "rules",
      createdAt: new Date(0).toISOString(),
      source: "system",
    });
  }

  // Salon-authored first (by date), then stable system tips
  return items.sort((a, b) => {
    if (a.source !== b.source) return a.source === "salon" ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
