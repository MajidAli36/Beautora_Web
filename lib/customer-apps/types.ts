export const CUSTOMER_APP_STATUSES = [
  "not_configured",
  "setup_required",
  "pending_approval",
  "approved",
  "published",
  "suspended",
  "deactivated",
] as const;

export type CustomerAppStatus = (typeof CUSTOMER_APP_STATUSES)[number];

export const CUSTOMER_APP_FEATURE_KEYS = [
  "online_appointments",
  "product_catalog",
  "deals",
  "loyalty",
  "leaderboard",
  "referrals",
  "whatsapp",
  "notifications",
  "reviews",
  "memberships",
] as const;

export type CustomerAppFeatureKey = (typeof CUSTOMER_APP_FEATURE_KEYS)[number];

export type SettingOwnership =
  | "super_admin_only"
  | "super_admin_init_client_edit"
  | "client_edit"
  | "read_only"
  | "requires_approval";

export type CustomerAppBranding = {
  appName: string;
  brandName: string;
  salonDisplayName: string;
  shortDescription: string;
  detailedDescription: string;
  logoUrl: string | null;
  iconUrl: string | null;
  primaryColor: string;
  accentColor: string;
  supportPhone: string;
  whatsappNumber: string;
  supportEmail: string;
  websiteUrl: string;
};

export type CustomerAppExperience = {
  welcomeMessage: string;
  homepageHeadline: string;
  homepageDescription: string;
  promoBannerUrl: string | null;
  homepageSections: string[];
  navItems: string[];
  bookingInstructions: string;
  cancellationPolicy: string;
  termsUrl: string;
  privacyUrl: string;
};

export type CustomerAppSettings = {
  branding: CustomerAppBranding;
  experience: CustomerAppExperience;
  features: Partial<Record<CustomerAppFeatureKey, boolean>>;
};

export type CustomerAppRow = {
  id: string;
  organization_id: string;
  slug: string;
  display_name: string;
  status: CustomerAppStatus;
  enabled_at: string | null;
  published_at: string | null;
  suspended_at: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CustomerAppListItem = CustomerAppRow & {
  organizationName: string;
  organizationSlug: string;
  featureEnabledCount: number;
  salonCount: number;
};

/** Field ownership map — clients cannot edit super_admin_only / read_only. */
export const SETTING_OWNERSHIP: Record<string, SettingOwnership> = {
  "branding.appName": "super_admin_init_client_edit",
  "branding.brandName": "super_admin_init_client_edit",
  "branding.salonDisplayName": "super_admin_init_client_edit",
  "branding.shortDescription": "client_edit",
  "branding.detailedDescription": "client_edit",
  "branding.logoUrl": "client_edit",
  "branding.iconUrl": "client_edit",
  "branding.primaryColor": "client_edit",
  "branding.accentColor": "client_edit",
  "branding.supportPhone": "client_edit",
  "branding.whatsappNumber": "client_edit",
  "branding.supportEmail": "client_edit",
  "branding.websiteUrl": "client_edit",
  "experience.welcomeMessage": "client_edit",
  "experience.homepageHeadline": "client_edit",
  "experience.homepageDescription": "client_edit",
  "experience.promoBannerUrl": "client_edit",
  "experience.homepageSections": "client_edit",
  "experience.navItems": "client_edit",
  "experience.bookingInstructions": "client_edit",
  "experience.cancellationPolicy": "requires_approval",
  "experience.termsUrl": "client_edit",
  "experience.privacyUrl": "client_edit",
  "features": "requires_approval",
};

export function isPublishedLive(status: CustomerAppStatus): boolean {
  return status === "published";
}

export function blocksCustomerApi(status: CustomerAppStatus): boolean {
  return status !== "published";
}
