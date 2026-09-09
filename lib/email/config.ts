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
 * App origin for in-app redirects / SSR (may be localhost in `next dev`).
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

/**
 * Origin used inside Resend auth emails (verify / reset).
 * Recipients open mail on their phone — localhost links are useless.
 * Default is always the public production site unless EMAIL_USE_LOCAL_LINKS=true.
 */
export function getEmailLinkBaseUrl(): string {
  const explicit = process.env.EMAIL_APP_BASE_URL?.trim();
  if (explicit) return stripSlash(explicit);

  // Opt-in only: local inbox testing against local next dev
  if (process.env.EMAIL_USE_LOCAL_LINKS === "true") {
    return getAppBaseUrl();
  }

  const fromApp = process.env.APP_BASE_URL?.trim();
  if (fromApp && !isLocalHost(fromApp)) return stripSlash(fromApp);

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site && !isLocalHost(site)) return stripSlash(site);

  return SYNCOPS.url; // https://www.beautora.app
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
    emailLinkBaseUrl: getEmailLinkBaseUrl(),
    isProduction: isProductionRuntime(),
  };
}
