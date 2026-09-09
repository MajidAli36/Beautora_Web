import { SYNCOPS } from "@/lib/print/syncops";
import { getSiteUrl } from "@/lib/seo/site";

function stripSlash(url: string) {
  return url.replace(/\/$/, "");
}

function isLocalHost(url: string) {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function isProductionRuntime() {
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.NODE_ENV === "production"
  );
}

/**
 * Public app origin for email links (verify / reset / dashboard CTAs).
 * Production never emits localhost — falls back to beautora.app.
 */
export function getAppBaseUrl(): string {
  const fromApp = process.env.APP_BASE_URL?.trim()
    ? stripSlash(process.env.APP_BASE_URL.trim())
    : "";
  const site = stripSlash(getSiteUrl());

  if (isProductionRuntime()) {
    if (fromApp && !isLocalHost(fromApp)) return fromApp;
    if (site && !isLocalHost(site)) return site;
    return SYNCOPS.url;
  }

  if (fromApp) return fromApp;
  return site || SYNCOPS.url;
}

export function getEmailConfig() {
  const apiKey =
    process.env.SMTP_PASSWORD?.trim() ||
    process.env.RESEND_API_KEY?.trim() ||
    "";

  const fromEmail =
    process.env.SMTP_FROM_EMAIL?.trim() || "no-reply@beautora.app";
  const fromName = process.env.SMTP_FROM_NAME?.trim() || SYNCOPS.name;

  return {
    /** Resend API key (same value as SMTP password for smtp.resend.com). */
    apiKey,
    host: process.env.SMTP_HOST?.trim() || "smtp.resend.com",
    port: Number(process.env.SMTP_PORT || 465),
    username: process.env.SMTP_USERNAME?.trim() || "resend",
    fromEmail,
    fromName,
    fromHeader: `${fromName} <${fromEmail}>`,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || SYNCOPS.email,
    configured: Boolean(apiKey),
    appBaseUrl: getAppBaseUrl(),
    isProduction: isProductionRuntime(),
  };
}
