/** Shared Customer API response shapes — mirrors `/api/customer/v1/*`. */

export type AppConfigResponse = {
  slug: string;
  status: string;
  displayName: string;
  settings: {
    branding: {
      appName: string;
      brandName: string;
      salonDisplayName: string;
      shortDescription: string;
      primaryColor: string;
      accentColor: string;
      whatsappNumber: string;
      supportPhone: string;
      logoUrl?: string | null;
    };
    experience: {
      welcomeMessage: string;
      homepageHeadline: string;
      homepageDescription: string;
      bookingInstructions?: string;
      promoBannerUrl?: string | null;
    };
    features: Partial<
      Record<
        | "online_appointments"
        | "product_catalog"
        | "deals"
        | "loyalty"
        | "leaderboard"
        | "referrals"
        | "whatsapp"
        | "notifications"
        | "reviews"
        | "memberships",
        boolean | undefined
      >
    >;
  };
  organizationIds: string[];
};

export type SalonRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  phone: string | null;
  tagline: string | null;
  address?: string | null;
};

export type ServiceRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
};

export type StaffRow = {
  id: string;
  organizationId: string;
  fullName: string;
  jobTitle: string | null;
};

export type ProductRow = {
  id: string;
  organizationId?: string;
  name: string;
  title?: string;
  description: string | null;
  retail_price: number;
  price?: number;
  imageUrl?: string | null;
  stock_quantity: number | null;
  product_kind: string;
};

export type DealRow = {
  id: string;
  title: string;
  description: string;
  discountPercent: number | null;
  discountAmount: number | null;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export type ReelRow = {
  id: string;
  title: string;
  caption: string;
  videoUrl: string;
  posterUrl: string | null;
  productId: string | null;
  serviceId: string | null;
  sortOrder: number;
};

export type PointTypeRow = {
  id: string;
  code: string;
  name: string;
  description?: string;
  color: string;
  earnHint: string;
};

export type PointsHistoryRow = {
  id: string;
  deltaPoints: number;
  balanceAfter: number;
  reason: string;
  pointTypeId: string | null;
  pointTypeName: string | null;
  createdAt: string;
};

export type LeaderboardTierRow = {
  rank: number;
  title: string;
  description: string;
  rewardKind: "service" | "product" | "custom";
  rewardImageUrl: string | null;
  serviceId: string | null;
  appProductId: string | null;
  customRewardLabel: string;
};

export type BookingRow = {
  id: string;
  organization_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  source: string;
  booking_number?: string | null;
  notes?: string | null;
};
