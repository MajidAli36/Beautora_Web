import { APP_TIMEZONE, getLocalHour } from "@/lib/dates/local";
import {
  currencyFromCode,
  currencyFromCountry,
  currencyUsesSpacedSymbol,
  formatCurrencyAmount,
} from "@/lib/currency/from-country";
import { getCurrencyConfig } from "@/lib/currency/runtime";

export type FormatCurrencyOptions = {
  /** Override using store country (e.g. public store page). */
  country?: string | null;
  /** Override using ISO currency code. */
  currency?: string | null;
};

function resolveFormatCurrency(opts?: FormatCurrencyOptions) {
  if (opts?.currency) return currencyFromCode(opts.currency);
  if (opts?.country) return currencyFromCountry(opts.country);
  return getCurrencyConfig();
}

/**
 * Money display — store-country currency with explicit symbol.
 * Examples: Rs 1,500.00 · ₹1,500.00 · AED 1,500.00 · $1,500.00
 */
export function formatCurrency(
  amount: number | string,
  opts?: FormatCurrencyOptions
) {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  const safe = Number.isNaN(value) ? 0 : value;
  const config = resolveFormatCurrency(opts);
  const body = formatCurrencyAmount(safe, config);
  const spaced = currencyUsesSpacedSymbol(config.code);
  return spaced ? `${config.symbol} ${body}` : `${config.symbol}${body}`;
}

export function formatCurrencyCompact(
  amount: number,
  opts?: FormatCurrencyOptions
) {
  const config = resolveFormatCurrency(opts);
  try {
    const body = new Intl.NumberFormat(config.locale, {
      notation: Math.abs(amount) >= 1000 ? "compact" : "standard",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    const spaced = currencyUsesSpacedSymbol(config.code);
    return spaced ? `${config.symbol} ${body}` : `${config.symbol}${body}`;
  } catch {
    return formatCurrency(amount, opts);
  }
}

export function formatCustomerName(firstName: string, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatDate(date: Date | string, style: "short" | "long" | "weekday" = "short") {
  const d = typeof date === "string" ? new Date(date) : date;
  if (style === "long") {
    return d.toLocaleDateString("en-PK", {
      timeZone: APP_TIMEZONE,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
  if (style === "weekday") {
    return d.toLocaleDateString("en-PK", {
      timeZone: APP_TIMEZONE,
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }
  return d.toLocaleDateString("en-PK", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Always 12-hour with AM/PM in Pakistan time — stable across SSR and client. */
export function formatTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-PK", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Date + AM/PM time, e.g. "Sep 5, 2026 · 3:07 AM" (Pakistan). */
export function formatDateTime(date: Date | string) {
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatPercentChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
}

export function getGreeting(name?: string | null) {
  const hour = getLocalHour();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = name?.split("@")[0]?.split(".")[0];
  if (firstName) {
    return `${timeGreeting}, ${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`;
  }
  return timeGreeting;
}

export function getInitials(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/** Relative label like "2 days ago" / "Just now" (client or server). */
export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const ms = Date.now() - d.getTime();
  if (Number.isNaN(ms)) return "—";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "Just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
