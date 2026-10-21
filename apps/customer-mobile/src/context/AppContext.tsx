import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CustomerApiError,
  getApiBaseUrl,
  getConfiguredAppSlug,
  syncCustomerAppBundle,
  type CustomerAppBundle,
  fetchLoyalty,
  fetchBookingsByPhone,
} from "../api/client";
import type { BookingRow, PointsHistoryRow, PointTypeRow } from "../api/types";
import { loadProfile, saveProfile, type CustomerProfile } from "../storage/profile";
import { themeFromBrand, type AppTheme } from "../theme";

type LoyaltyState = {
  balance: number;
  pointTypes: PointTypeRow[];
  history: PointsHistoryRow[];
  note: string;
} | null;

type AppContextValue = {
  ready: boolean;
  syncing: boolean;
  error: string | null;
  bundle: CustomerAppBundle | null;
  theme: AppTheme;
  profile: CustomerProfile;
  loyalty: LoyaltyState;
  bookings: BookingRow[];
  refresh: (phoneOverride?: string) => Promise<void>;
  updateProfile: (patch: Partial<CustomerProfile>) => Promise<void>;
  refreshPersonal: (phoneOverride?: string) => Promise<void>;
  apiMeta: { baseUrl: string; slug: string };
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<CustomerAppBundle | null>(null);
  const [profile, setProfile] = useState<CustomerProfile>({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [loyalty, setLoyalty] = useState<LoyaltyState>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const refreshPersonal = useCallback(async (phoneOverride?: string) => {
    const phone = (phoneOverride ?? profile.phone).trim();
    if (!phone || !bundle) {
      setLoyalty(null);
      setBookings([]);
      return;
    }
    const features = bundle.config.settings.features;
    try {
      const [loy, books] = await Promise.all([
        features.loyalty
          ? fetchLoyalty(phone).catch(() => null)
          : Promise.resolve(null),
        fetchBookingsByPhone(phone).catch(() => ({ bookings: [] as BookingRow[] })),
      ]);
      if (loy) {
        setLoyalty({
          balance: loy.balance,
          pointTypes: loy.pointTypes ?? [],
          history: loy.history ?? [],
          note: loy.rules.note || "",
        });
      } else {
        setLoyalty(null);
      }
      setBookings(books.bookings ?? []);
    } catch {
      /* personal data is best-effort */
    }
  }, [bundle, profile.phone]);

  const refresh = useCallback(async (phoneOverride?: string) => {
    setSyncing(true);
    setError(null);
    try {
      const next = await syncCustomerAppBundle();
      setBundle(next);
      const phone = (phoneOverride ?? profile.phone).trim();
      if (phone) {
        const features = next.config.settings.features;
        const [loy, books] = await Promise.all([
          features.loyalty
            ? fetchLoyalty(phone).catch(() => null)
            : Promise.resolve(null),
          fetchBookingsByPhone(phone).catch(() => ({ bookings: [] as BookingRow[] })),
        ]);
        if (loy) {
          setLoyalty({
            balance: loy.balance,
            pointTypes: loy.pointTypes ?? [],
            history: loy.history ?? [],
            note: loy.rules.note || "",
          });
        } else {
          setLoyalty(null);
        }
        setBookings(books.bookings ?? []);
      } else {
        setLoyalty(null);
        setBookings([]);
      }
    } catch (e) {
      const msg =
        e instanceof CustomerApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Sync failed";
      setError(msg);
    } finally {
      setSyncing(false);
      setReady(true);
    }
  }, [profile.phone]);

  useEffect(() => {
    void (async () => {
      const p = await loadProfile();
      setProfile(p);
      setSyncing(true);
      try {
        const next = await syncCustomerAppBundle();
        setBundle(next);
        if (p.phone.trim()) {
          const features = next.config.settings.features;
          const [loy, books] = await Promise.all([
            features.loyalty
              ? fetchLoyalty(p.phone).catch(() => null)
              : Promise.resolve(null),
            fetchBookingsByPhone(p.phone).catch(() => ({
              bookings: [] as BookingRow[],
            })),
          ]);
          if (loy) {
            setLoyalty({
              balance: loy.balance,
              pointTypes: loy.pointTypes ?? [],
              history: loy.history ?? [],
              note: loy.rules.note || "",
            });
          }
          setBookings(books.bookings ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load app");
      } finally {
        setSyncing(false);
        setReady(true);
      }
    })();
  }, []);

  const updateProfile = useCallback(async (patch: Partial<CustomerProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void saveProfile(next);
      return next;
    });
  }, []);

  const theme = useMemo(
    () =>
      themeFromBrand(
        bundle?.config.settings.branding.primaryColor,
        bundle?.config.settings.branding.accentColor
      ),
    [bundle]
  );

  const value: AppContextValue = {
    ready,
    syncing,
    error,
    bundle,
    theme,
    profile,
    loyalty,
    bookings,
    refresh,
    updateProfile,
    refreshPersonal,
    apiMeta: { baseUrl: getApiBaseUrl(), slug: getConfiguredAppSlug() },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
