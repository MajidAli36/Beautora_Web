import { BRAND } from "@/lib/marketing/brand";
import {
  defaultThankYouTemplateBody,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp/templates";

type ThanksMessageInput = {
  firstName?: string | null;
  fullName?: string | null;
  salonName?: string | null;
  phone?: string | null;
  address?: string | null;
};

/**
 * Fallback thank-you for customer profile quick-send.
 * WhatsApp page uses saved org templates instead.
 */
export function buildCustomerThanksMessage(input: ThanksMessageInput = {}): string {
  return renderWhatsAppTemplate(defaultThankYouTemplateBody(), {
    firstName: input.firstName,
    fullName: input.fullName,
    salonName: input.salonName ?? BRAND.name,
    phone: input.phone ?? BRAND.phone,
    address: input.address ?? BRAND.address,
  });
}
