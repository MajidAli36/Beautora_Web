import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemePresetId } from "../theme/presets";

const KEY = "@beautora/customer_prefs_v1";

export type CustomerPreferences = {
  /** Profile + phone saved at least once */
  onboardingComplete: boolean;
  /** Theme chosen after onboarding */
  themeSelected: boolean;
  themeId: ThemePresetId;
};

const DEFAULTS: CustomerPreferences = {
  onboardingComplete: false,
  themeSelected: false,
  themeId: "salon",
};

export async function loadPreferences(): Promise<CustomerPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as CustomerPreferences) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function savePreferences(
  prefs: CustomerPreferences
): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(prefs));
}
