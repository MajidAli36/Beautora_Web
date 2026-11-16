/**
 * Beautora Customer API client.
 * Identity = published app slug (header + ?app=). Never trust client org IDs blindly —
 * server re-validates against the published customer app assignment.
 */

import type {
  AppConfigResponse,
  BookingRow,
  DealRow,
  LeaderboardTierRow,
  PointTypeRow,
  PointsHistoryRow,
  ProductRow,
  ReelRow,
  SalonRow,
  ServiceRow,
  StaffRow,
} from "./types";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://www.beautora.app").replace(
  /\/$/,
  ""
);
const APP_SLUG = process.env.EXPO_PUBLIC_APP_SLUG || "";

export class CustomerApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "CustomerApiError";
  }
}

async function customerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  if (!APP_SLUG) {
    throw new CustomerApiError(
      "Set EXPO_PUBLIC_APP_SLUG to your published customer app slug",
      0
    );
  }

  const url = new URL(`${API_URL}${path}`);
  if (!url.searchParams.has("app")) url.searchParams.set("app", APP_SLUG);

  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-beautora-app-slug": APP_SLUG,
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CustomerApiError(
      typeof data?.error === "string" ? data.error : `HTTP ${res.status}`,
      res.status
    );
  }
  return data as T;
}

export function getConfiguredAppSlug() {
  return APP_SLUG;
}

export function getApiBaseUrl() {
  return API_URL;
}

export function fetchAppConfig() {
  return customerFetch<AppConfigResponse>("/api/customer/v1/app-config");
}

export function fetchSalons() {
  return customerFetch<{ salons: SalonRow[] }>("/api/customer/v1/salons");
}

export function fetchServices() {
  return customerFetch<{ services: ServiceRow[] }>("/api/customer/v1/services");
}

export function fetchStaff(organizationId?: string) {
  const q = organizationId
    ? `?organizationId=${encodeURIComponent(organizationId)}`
    : "";
  return customerFetch<{ staff: StaffRow[] }>(`/api/customer/v1/staff${q}`);
}

export function fetchProducts() {
  return customerFetch<{ products: ProductRow[] }>("/api/customer/v1/products");
}

export function fetchDeals() {
  return customerFetch<{ deals: DealRow[] }>("/api/customer/v1/deals");
}

export function fetchReels() {
  return customerFetch<{ reels: ReelRow[] }>("/api/customer/v1/reels");
}

export type PublicNotification = {
  id: string;
  title: string;
  body: string;
  kind: string;
  createdAt: string;
  source: "salon" | "system";
};

export function fetchNotifications() {
  return customerFetch<{ notifications: PublicNotification[] }>(
    "/api/customer/v1/notifications"
  );
}

export function fetchLoyalty(phone?: string) {
  const q = phone ? `?phone=${encodeURIComponent(phone)}` : "";
  return customerFetch<{
    rules: {
      pointsPerCompletedBooking: number;
      pointsPerProductPurchase: number;
      pointsPerCurrency: number;
      welcomeBonus: number;
      minRedeemPoints: number;
      redeemPointsPerCurrency: number;
      note: string;
    };
    pointTypes: PointTypeRow[];
    balance: number;
    recent: { delta_points: number; reason: string; created_at: string }[];
    history: PointsHistoryRow[];
  }>(`/api/customer/v1/loyalty${q}`);
}

/** Short-lived QR payload for salon desk to redeem / reduce points. */
export function fetchLoyaltyQrToken(phone: string) {
  const q = new URLSearchParams({ phone });
  return customerFetch<{
    code: string;
    qrPayload: string;
    balance: number;
    expiresAt: string;
    minRedeemPoints: number;
  }>(`/api/customer/v1/loyalty/qr?${q.toString()}`);
}

/** Salon / kiosk redeem — deducts points using a scanned QR token. */
export function redeemLoyaltyPoints(body: {
  token: string;
  points: number;
  reason?: string;
}) {
  return customerFetch<{
    ok: boolean;
    balance: number;
    redeemed: number;
  }>("/api/customer/v1/loyalty/redeem", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchPointsHistory(phone: string) {
  const q = new URLSearchParams({ phone });
  return customerFetch<{
    phone: string;
    pointTypes: PointTypeRow[];
    history: PointsHistoryRow[];
  }>(`/api/customer/v1/points-history?${q.toString()}`);
}

export function fetchLeaderboard() {
  return customerFetch<{
    title: string;
    metric: string;
    windowDays: number;
    note: string;
    rows: { rank: number; displayName: string; score: number }[];
    tiers: LeaderboardTierRow[];
  }>("/api/customer/v1/leaderboard");
}

export function fetchBookingsByPhone(phone: string) {
  const q = new URLSearchParams({ phone });
  return customerFetch<{ bookings: BookingRow[] }>(
    `/api/customer/v1/bookings?${q.toString()}`
  );
}

export function createBooking(body: {
  organizationId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  scheduledAt: string;
  staffId: string;
  serviceIds: string[];
  notes?: string;
}) {
  return customerFetch<{
    ok: boolean;
    appointmentId?: string;
    bookingNumber?: string;
    appCustomerId?: string;
  }>("/api/customer/v1/bookings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Parallel bootstrap used on app launch / pull-to-refresh. */
export async function syncCustomerAppBundle() {
  const config = await fetchAppConfig();
  const features = config.settings.features;

  const [salons, services, products, deals, reels, leaderboard, notifications] =
    await Promise.all([
      fetchSalons().catch(() => ({ salons: [] as SalonRow[] })),
      features.online_appointments
        ? fetchServices().catch(() => ({ services: [] as ServiceRow[] }))
        : Promise.resolve({ services: [] as ServiceRow[] }),
      features.product_catalog
        ? fetchProducts().catch(() => ({ products: [] as ProductRow[] }))
        : Promise.resolve({ products: [] as ProductRow[] }),
      fetchDeals().catch(() => ({ deals: [] as DealRow[] })),
      fetchReels().catch(() => ({ reels: [] as ReelRow[] })),
      features.leaderboard
        ? fetchLeaderboard().catch(() => null)
        : Promise.resolve(null),
      fetchNotifications().catch(() => ({
        notifications: [] as PublicNotification[],
      })),
    ]);

  return {
    config,
    salons: salons.salons,
    services: services.services,
    products: products.products,
    deals: deals.deals,
    reels: reels.reels,
    leaderboard,
    notifications: notifications.notifications,
    syncedAt: new Date().toISOString(),
  };
}

export type CustomerAppBundle = Awaited<ReturnType<typeof syncCustomerAppBundle>>;
