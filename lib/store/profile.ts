/** Shared types + helpers for salon store profile / booking identity */

export type BusinessDayKey =
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

export type BusinessHoursDay = {
  day: BusinessDayKey;
  label: string;
  closed: boolean;
  open: string;
  close: string;
};

export type PaymentAccountType = "JAZZCASH" | "EASYPAISA" | "BANK" | "OTHER";

export type PaymentAccount = {
  id: string;
  account_type: PaymentAccountType;
  label: string;
  account_title: string | null;
  account_number: string;
  bank_name: string | null;
  extra_note: string | null;
  is_active: boolean;
  sort_order: number;
};

export const DEFAULT_BUSINESS_HOURS: BusinessHoursDay[] = [
  { day: "mon", label: "Monday", closed: false, open: "10:00", close: "20:00" },
  { day: "tue", label: "Tuesday", closed: false, open: "10:00", close: "20:00" },
  { day: "wed", label: "Wednesday", closed: false, open: "10:00", close: "20:00" },
  { day: "thu", label: "Thursday", closed: false, open: "10:00", close: "20:00" },
  { day: "fri", label: "Friday", closed: false, open: "10:00", close: "20:00" },
  { day: "sat", label: "Saturday", closed: false, open: "10:00", close: "20:00" },
  { day: "sun", label: "Sunday", closed: false, open: "11:00", close: "18:00" },
];

export const PAYMENT_ACCOUNT_TYPE_LABELS: Record<PaymentAccountType, string> = {
  JAZZCASH: "JazzCash",
  EASYPAISA: "EasyPaisa",
  BANK: "Bank transfer",
  OTHER: "Other",
};

export function parseBusinessHours(raw: unknown): BusinessHoursDay[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_BUSINESS_HOURS;
  const byDay = new Map<string, BusinessHoursDay>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const day = String(row.day ?? "");
    if (!DEFAULT_BUSINESS_HOURS.some((d) => d.day === day)) continue;
    byDay.set(day, {
      day: day as BusinessDayKey,
      label: String(row.label ?? day),
      closed: Boolean(row.closed),
      open: String(row.open ?? "10:00"),
      close: String(row.close ?? "20:00"),
    });
  }
  return DEFAULT_BUSINESS_HOURS.map((d) => byDay.get(d.day) ?? d);
}

/** Format "HH:mm" or "HH:mm:ss" as 12-hour with AM/PM, e.g. "10:00 AM". */
export function formatClockAmPm(time: string): string {
  const [hRaw, mRaw] = time.slice(0, 5).split(":");
  let hour = Number(hRaw);
  const minute = Number(mRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return time.slice(0, 5);

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatHoursLine(day: BusinessHoursDay): string {
  if (day.closed) return "Closed";
  return `${formatClockAmPm(day.open)} – ${formatClockAmPm(day.close)}`;
}

export function formatPaymentAccountBlock(account: PaymentAccount): string {
  const type = PAYMENT_ACCOUNT_TYPE_LABELS[account.account_type];
  const lines = [`${account.label} (${type})`];
  if (account.account_title) lines.push(`Title: ${account.account_title}`);
  if (account.bank_name) lines.push(`Bank: ${account.bank_name}`);
  lines.push(`Number: ${account.account_number}`);
  if (account.extra_note) lines.push(account.extra_note);
  return lines.join("\n");
}

export function buildPaymentInstructions(params: {
  accounts: PaymentAccount[];
  extraNotes?: string | null;
}): string {
  const active = params.accounts.filter((a) => a.is_active);
  const parts: string[] = [];
  if (active.length) {
    parts.push(active.map(formatPaymentAccountBlock).join("\n\n"));
  }
  if (params.extraNotes?.trim()) {
    parts.push(params.extraNotes.trim());
  }
  return parts.join("\n\n");
}
