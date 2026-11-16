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
import {
  loadPreferences,
  savePreferences,
  type CustomerPreferences,
} from "../storage/preferences";
import {
  buildThemeFromPreset,
  isDarkTheme,
  type AppTheme,
  type ThemePresetId,
} from "../theme";

type LoyaltyState = {
  balance: number;
  pointTypes: PointTypeRow[];
  history: PointsHistoryRow[];
  note: string;
  minRedeemPoints: number;
  redeemPointsPerCurrency: number;
  pointsPerCompletedBooking: number;
  pointsPerProductPurchase: number;
  pointsPerCurrency: number;
  welcomeBonus: number;
  /** Full readable rules text for How to earn */
  rulesText: string;
} | null;

type AppContextValue = {
  ready: boolean;
  syncing: boolean;
  error: string | null;
  bundle: CustomerAppBundle | null;
  theme: AppTheme;
  isDark: boolean;
  profile: CustomerProfile;
  preferences: CustomerPreferences;
  needsOnboarding: boolean;
  loyalty: LoyaltyState;
  bookings: BookingRow[];
  refresh: (phoneOverride?: string) => Promise<void>;
  updateProfile: (patch: Partial<CustomerProfile>) => Promise<void>;
  refreshPersonal: (phoneOverride?: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setThemeId: (themeId: ThemePresetId, markSelected?: boolean) => Promise<void>;
  apiMeta: { baseUrl: string; slug: string };
};

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_PREFS: CustomerPreferences = {
  onboardingComplete: false,
  themeSelected: false,
  themeId: "salon",
};

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
  const [preferences, setPreferences] = useState<CustomerPreferences>(EMPTY_PREFS);
  const [loyalty, setLoyalty] = useState<LoyaltyState>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  const applyLoyalty = useCallback(
    (
      loy: Awaited<ReturnType<typeof fetchLoyalty>> | null
    ) => {
      if (!loy) {
        setLoyalty(null);
        return;
      }
      const note = loy.rules.note || "";
      const lines: string[] = [];
      if (note.trim()) {
        lines.push(note.trim(), "");
      }
      lines.push("How to earn points:");
      if (loy.rules.welcomeBonus > 0) {
        lines.push(`• Welcome bonus: ${loy.rules.welcomeBonus} points`);
      }
      if (loy.rules.pointsPerCompletedBooking > 0) {
        lines.push(
          `• Completed booking: ${loy.rules.pointsPerCompletedBooking} points`
        );
      }
      if (loy.rules.pointsPerProductPurchase > 0) {
        lines.push(
          `• Product purchase: ${loy.rules.pointsPerProductPurchase} points`
        );
      }
      if (loy.rules.pointsPerCurrency > 0) {
        lines.push(
          `• Spending: ${loy.rules.pointsPerCurrency} point(s) per currency unit`
        );
      }
      for (const t of loy.pointTypes ?? []) {
        if (t.earnHint?.trim()) lines.push(`• ${t.name}: ${t.earnHint.trim()}`);
      }
      lines.push("", "How to redeem:");
      lines.push(`• Minimum redeem: ${loy.rules.minRedeemPoints ?? 0} points`);
      if (loy.rules.redeemPointsPerCurrency > 0) {
        lines.push(
          `• ${loy.rules.redeemPointsPerCurrency} points ≈ 1 currency unit off`
        );
      }
      lines.push("• Show your virtual card QR at the salon desk to redeem.");

      setLoyalty({
        balance: loy.balance,
        pointTypes: loy.pointTypes ?? [],
        history: loy.history ?? [],
        note,
        minRedeemPoints: loy.rules.minRedeemPoints ?? 0,
        redeemPointsPerCurrency: loy.rules.redeemPointsPerCurrency ?? 0,
        pointsPerCompletedBooking: loy.rules.pointsPerCompletedBooking ?? 0,
        pointsPerProductPurchase: loy.rules.pointsPerProductPurchase ?? 0,
        pointsPerCurrency: loy.rules.pointsPerCurrency ?? 0,
        welcomeBonus: loy.rules.welcomeBonus ?? 0,
        rulesText: lines.join("\n").trim(),
      });
    },
    []
  );

  const refreshPersonal = useCallback(
    async (phoneOverride?: string) => {
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
        applyLoyalty(loy);
        setBookings(books.bookings ?? []);
      } catch {
        /* personal data is best-effort */
      }
    },
    [applyLoyalty, bundle, profile.phone]
  );

  const refresh = useCallback(
    async (phoneOverride?: string) => {
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
            fetchBookingsByPhone(phone).catch(() => ({
              bookings: [] as BookingRow[],
            })),
          ]);
          applyLoyalty(loy);
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
    },
    [applyLoyalty, profile.phone]
  );

  useEffect(() => {
    void (async () => {
      const [p, prefs] = await Promise.all([loadProfile(), loadPreferences()]);
      setProfile(p);
      // Existing users with a phone already set skip register, but still pick a theme once
      const migrated: CustomerPreferences = {
        ...prefs,
        onboardingComplete:
          prefs.onboardingComplete || Boolean(p.phone.trim() && p.firstName.trim()),
      };
      setPreferences(migrated);
      if (migrated.onboardingComplete !== prefs.onboardingComplete) {
        void savePreferences(migrated);
      }
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
          applyLoyalty(loy);
          setBookings(books.bookings ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load app");
      } finally {
        setSyncing(false);
        setReady(true);
      }
    })();
  }, [applyLoyalty]);

  const updateProfile = useCallback(async (patch: Partial<CustomerProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void saveProfile(next);
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    const prev = await loadPreferences();
    const next: CustomerPreferences = { ...prev, onboardingComplete: true };
    await savePreferences(next);
    setPreferences(next);
  }, []);

  const setThemeId = useCallback(
    async (themeId: ThemePresetId, markSelected = true) => {
      const prev = await loadPreferences();
      const next: CustomerPreferences = {
        ...prev,
        themeId,
        themeSelected: markSelected ? true : prev.themeSelected,
      };
      await savePreferences(next);
      setPreferences(next);
    },
    []
  );

  const theme = useMemo(
    () =>
      buildThemeFromPreset(
        preferences.themeId,
        bundle?.config.settings.branding.primaryColor,
        bundle?.config.settings.branding.accentColor
      ),
    [bundle, preferences.themeId]
  );

  const needsOnboarding =
    !preferences.onboardingComplete || !preferences.themeSelected;

  const value: AppContextValue = {
    ready,
    syncing,
    error,
    bundle,
    theme,
    isDark: isDarkTheme(preferences.themeId),
    profile,
    preferences,
    needsOnboarding,
    loyalty,
    bookings,
    refresh,
    updateProfile,
    refreshPersonal,
    completeOnboarding,
    setThemeId,
    apiMeta: { baseUrl: getApiBaseUrl(), slug: getConfiguredAppSlug() },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
