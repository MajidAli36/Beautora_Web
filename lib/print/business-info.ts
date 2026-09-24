import type { BusinessPrintInfo } from "@/lib/print/thermal-html";

type OrgPrintRow = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp_phone?: string | null;
};

/** Map organization profile fields → thermal receipt header. */
export function orgToBusinessPrintInfo(
  org: OrgPrintRow | null | undefined,
  fallbackName = "Salon"
): BusinessPrintInfo {
  const name = org?.name?.trim() || fallbackName;
  const address = [org?.address?.trim(), org?.city?.trim()].filter(Boolean).join(", ") || null;
  const phone = org?.phone?.trim() || null;
  const whatsapp = org?.whatsapp_phone?.trim() || null;

  return {
    name,
    address,
    country: org?.country?.trim() || null,
    phone: phone || whatsapp,
    phonePtcl: phone,
    phoneMobile: whatsapp || phone,
  };
}
