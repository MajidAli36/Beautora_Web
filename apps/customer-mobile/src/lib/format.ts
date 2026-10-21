export function formatMoney(value: number | null | undefined, currency = "PKR") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString()}`;
  }
}

export function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function formatDayLabel(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function toLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function buildDayOptions(count = 14) {
  const out: { key: string; label: string }[] = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const key = toLocalDateKey(d);
    out.push({ key, label: formatDayLabel(key) });
  }
  return out;
}

export const TIME_SLOTS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export function combineLocalDateTime(dateKey: string, timeHHMM: string) {
  return new Date(`${dateKey}T${timeHHMM}:00`).toISOString();
}

export type BookingStatusTone = "ok" | "warn" | "bad" | "neutral";

export function bookingStatusMeta(status: string): {
  label: string;
  tone: BookingStatusTone;
} {
  const s = (status || "").toUpperCase();
  if (s === "COMPLETED" || s === "CHECKED_IN") return { label: "Completed", tone: "ok" };
  if (s === "SCHEDULED" || s === "CONFIRMED") return { label: "Upcoming", tone: "ok" };
  if (s === "PENDING" || s === "AWAITING_DEPOSIT") return { label: "Pending", tone: "warn" };
  if (s === "CANCELLED" || s === "NO_SHOW") return { label: s === "NO_SHOW" ? "No-show" : "Cancelled", tone: "bad" };
  return { label: status || "Unknown", tone: "neutral" };
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
