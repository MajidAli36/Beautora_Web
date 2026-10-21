import type { CustomerAppSettings } from "@/lib/customer-apps/types";

export function defaultCustomerAppSettings(input: {
  orgName: string;
  appName?: string;
}): CustomerAppSettings {
  const salon = input.orgName.trim() || "Salon";
  const appName = (input.appName ?? `${salon} App`).trim();
  return {
    branding: {
      appName,
      brandName: salon,
      salonDisplayName: salon,
      shortDescription: `Book ${salon} online.`,
      detailedDescription: `Welcome to ${salon}. Book appointments, browse services, and stay connected.`,
      logoUrl: null,
      iconUrl: null,
      primaryColor: "#0F766E",
      accentColor: "#F59E0B",
      supportPhone: "",
      whatsappNumber: "",
      supportEmail: "",
      websiteUrl: "",
    },
    experience: {
      welcomeMessage: `Welcome to ${salon}`,
      homepageHeadline: `Book with ${salon}`,
      homepageDescription: "Choose a service and pick a time that works for you.",
      promoBannerUrl: null,
      homepageSections: ["welcome", "services", "deals", "support"],
      navItems: ["home", "book", "products", "account", "support"],
      bookingInstructions: "Select a service, staff (optional), and an available slot.",
      cancellationPolicy: "Please cancel at least 24 hours in advance.",
      termsUrl: "",
      privacyUrl: "",
    },
    features: {
      online_appointments: true,
      product_catalog: false,
      deals: false,
      loyalty: false,
      leaderboard: false,
      referrals: false,
      whatsapp: true,
      notifications: false,
      reviews: false,
      memberships: false,
    },
  };
}

export function slugifyAppSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "app";
}

export function readinessChecklist(settings: CustomerAppSettings): {
  key: string;
  label: string;
  ok: boolean;
}[] {
  const b = settings.branding;
  return [
    { key: "appName", label: "App name set", ok: b.appName.trim().length >= 2 },
    {
      key: "salonDisplayName",
      label: "Salon display name set",
      ok: b.salonDisplayName.trim().length >= 2,
    },
    {
      key: "shortDescription",
      label: "Short description set",
      ok: b.shortDescription.trim().length >= 8,
    },
    {
      key: "support",
      label: "At least one support contact",
      ok: Boolean(
        b.supportPhone.trim() || b.whatsappNumber.trim() || b.supportEmail.trim()
      ),
    },
    {
      key: "booking",
      label: "Online appointments feature enabled",
      ok: Boolean(settings.features.online_appointments),
    },
  ];
}
