import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@beautora/customer_notif_read_v1";

export async function loadReadNotificationIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function markNotificationRead(id: string): Promise<string[]> {
  const current = await loadReadNotificationIds();
  if (current.includes(id)) return current;
  const next = [...current, id].slice(-200);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function markAllNotificationsRead(ids: string[]): Promise<string[]> {
  const current = await loadReadNotificationIds();
  const next = [...new Set([...current, ...ids])].slice(-200);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
