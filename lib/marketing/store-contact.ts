import { SYNCOPS } from "@/lib/print/syncops";

/** Digits only for comparing phone values. */
export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** Normalize PK mobiles so 0301… and 92301… compare equal. */
function normalizePkDigits(n: string): string {
  if (n.startsWith("92") && n.length >= 12) return n;
  if (n.startsWith("0") && n.length >= 11) return `92${n.slice(1)}`;
  return n;
}

/** True when the value is the Beautora/SyncOps support line (not a salon number). */
export function isPlatformSupportPhone(phone: string | null | undefined): boolean {
  const n = digitsOnly(phone);
  if (!n) return false;
  const platform = normalizePkDigits(digitsOnly(SYNCOPS.phone));
  return normalizePkDigits(n) === platform;
}

export type StorePublicContact = {
  /** Preferred number to show for “Call / WhatsApp”. */
  display: string;
  /** tel: href digits. */
  telHref: string;
  /** Optional WhatsApp chat link when a store number exists. */
  whatsappHref: string | null;
};

/**
 * Public store contact — organization phone / WhatsApp only.
 * Never falls back to platform SyncOps support numbers.
 */
export function resolveStorePublicContact(input: {
  phone?: string | null;
  whatsappPhone?: string | null;
}): StorePublicContact | null {
  const phone = input.phone?.trim() || null;
  const whatsapp = input.whatsappPhone?.trim() || null;

  const storePhone = phone && !isPlatformSupportPhone(phone) ? phone : null;
  const storeWhatsapp = whatsapp && !isPlatformSupportPhone(whatsapp) ? whatsapp : null;

  const display = storeWhatsapp || storePhone;
  if (!display) return null;

  const telHref = digitsOnly(display);
  const waSource = storeWhatsapp || storePhone;
  const waDigits = digitsOnly(waSource);
  let whatsappHref: string | null = null;
  if (waDigits) {
    const e164 = normalizePkDigits(waDigits);
    whatsappHref = `https://wa.me/${e164}`;
  }

  return {
    display,
    telHref,
    whatsappHref,
  };
}
