/**
 * WhatsApp template helpers.
 * Placeholders: {{first_name}} {{full_name}} {{salon_name}} {{phone}} {{address}}
 */

export const TEMPLATE_PLACEHOLDERS = [
  { key: "{{first_name}}", label: "Customer first name" },
  { key: "{{full_name}}", label: "Customer full name" },
  { key: "{{salon_name}}", label: "Salon name" },
  { key: "{{phone}}", label: "Salon phone" },
  { key: "{{address}}", label: "Salon address" },
] as const;

export function defaultThankYouTemplateBody(): string {
  return `Assalam o Alaikum {{first_name}},

Thank you so much for choosing *{{salon_name}}*. It truly means a lot to us that you trusted our team with your hair and beauty care.

We hope you loved your experience with us — from the moment you walked in, to the care our stylists gave you. Your comfort and confidence are always our priority.

If you were happy with your service, we would be grateful if you shared your feedback with friends and family, or left us a kind word.

We would love to welcome you again soon. You can book online anytime, or simply message us here on WhatsApp and we will gladly arrange a convenient slot for you.

📍 {{address}}
📞 {{phone}}

Once again, thank you for being part of the {{salon_name}} family. We look forward to seeing you again!

Warm regards,
Team {{salon_name}}`;
}

export type TemplateRenderContext = {
  firstName?: string | null;
  fullName?: string | null;
  salonName?: string | null;
  phone?: string | null;
  address?: string | null;
};

export function renderWhatsAppTemplate(
  body: string,
  ctx: TemplateRenderContext = {}
): string {
  const firstName =
    ctx.firstName?.trim() ||
    ctx.fullName?.trim().split(/\s+/)[0] ||
    "there";
  const fullName = ctx.fullName?.trim() || firstName;
  const salonName = ctx.salonName?.trim() || "our salon";
  const phone = ctx.phone?.trim() || "";
  const address = ctx.address?.trim() || "";

  return body
    .replaceAll("{{first_name}}", firstName)
    .replaceAll("{{full_name}}", fullName)
    .replaceAll("{{salon_name}}", salonName)
    .replaceAll("{{phone}}", phone || "—")
    .replaceAll("{{address}}", address || "—")
    .trim();
}
