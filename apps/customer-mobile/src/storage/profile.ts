import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@beautora/customer_profile_v1";

export type CustomerProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

const EMPTY: CustomerProfile = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
};

export async function loadProfile(): Promise<CustomerProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as CustomerProfile) };
  } catch {
    return { ...EMPTY };
  }
}

export async function saveProfile(profile: CustomerProfile): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(profile));
}
