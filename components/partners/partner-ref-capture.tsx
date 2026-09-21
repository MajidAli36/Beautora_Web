"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { rememberPartnerReferral } from "@/lib/actions/partners";
import {
  PARTNER_REF_STORAGE_KEY,
  readPartnerRefFromSearch,
  validatePartnerUsername,
} from "@/lib/partners/referral";

function readStoredRef(): string | null {
  try {
    const raw = window.localStorage.getItem(PARTNER_REF_STORAGE_KEY);
    if (!raw) return null;
    const validated = validatePartnerUsername(raw);
    return validated.ok ? validated.username : null;
  } catch {
    return null;
  }
}

function writeStoredRef(username: string) {
  try {
    window.localStorage.setItem(PARTNER_REF_STORAGE_KEY, username);
  } catch {
    /* private mode */
  }
}

function clearStoredRef() {
  try {
    window.localStorage.removeItem(PARTNER_REF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Captures ?ref= on any page (home, /partner, /signup, …) and keeps the
 * partner cookie + localStorage backup fresh for later signup/onboarding.
 */
export function PartnerRefCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fromUrl = readPartnerRefFromSearch(searchParams);
    const fromStore = readStoredRef();
    const code = fromUrl || fromStore;
    if (!code) return;

    let cancelled = false;
    void (async () => {
      const result = await rememberPartnerReferral(code);
      if (cancelled) return;
      if (result.success && result.username) {
        writeStoredRef(result.username);
        return;
      }
      // Invalid / inactive URL ref — drop backup so we don't keep retrying forever.
      if (fromUrl) clearStoredRef();
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, searchParams]);

  return null;
}
