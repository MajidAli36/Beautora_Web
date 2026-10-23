/**
 * Cloudflare Turnstile (CAPTCHA) helpers.
 * Set NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY to enforce on signup.
 * When unset (typical local dev), verification is skipped.
 */

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

export function isTurnstileConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
      process.env.TURNSTILE_SECRET_KEY?.trim()
  );
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  // Not configured → skip (local/dev). Production should set both keys.
  if (!secret || !siteKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[turnstile] Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY or TURNSTILE_SECRET_KEY — signup CAPTCHA is disabled"
      );
    }
    return { ok: true };
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    return { ok: false, error: "Please complete the CAPTCHA check" };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", trimmed);
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return { ok: false, error: "CAPTCHA verification failed. Try again." };
    }

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      return { ok: false, error: "CAPTCHA failed. Refresh and try again." };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "CAPTCHA verification unavailable. Try again." };
  }
}

function containsSpamLink(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    /https?:\/\//i.test(value) ||
    /www\./i.test(value) ||
    /\b[\w-]+\.(com|net|org|ru|io|app|xyz|info|biz|co|me|ly|cc|tk|ml|ga|cf)\b/i.test(
      lower
    ) ||
    /bit\.ly|t\.co|tinyurl|goo\.gl|cutt\.ly|rb\.gy/i.test(lower)
  );
}

/** Reject promotional spam stuffed into display names (URLs, bit.ly, etc.). */
export function validateHumanDisplayName(
  name: string,
  options?: { maxLength?: number; label?: string }
): { ok: true; value: string } | { ok: false; error: string } {
  const value = name.trim().replace(/\s+/g, " ");
  if (!value) return { ok: true, value: "" };

  const maxLength = options?.maxLength ?? 80;
  const label = options?.label ?? "Name";
  if (value.length > maxLength) {
    return { ok: false, error: `${label} is too long (max ${maxLength} characters)` };
  }

  if (containsSpamLink(value)) {
    return {
      ok: false,
      error: `${label} cannot include links or website addresses`,
    };
  }

  return { ok: true, value };
}
