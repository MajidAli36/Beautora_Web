"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getRememberedPartnerReferral,
  rememberPartnerReferral,
} from "@/lib/actions/partners";
import {
  PARTNER_REF_STORAGE_KEY,
  partnerReferralSignupPath,
} from "@/lib/partners/referral";

/** Banner when visiting /partner?ref=… or with a remembered partner. */
export function PartnerIncomingRefBanner() {
  const searchParams = useSearchParams();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const urlRef = searchParams.get("ref")?.trim();
      if (urlRef) {
        const result = await rememberPartnerReferral(urlRef);
        if (cancelled) return;
        if (result.username) {
          try {
            window.localStorage.setItem(PARTNER_REF_STORAGE_KEY, result.username);
          } catch {
            /* ignore */
          }
          setUsername(result.username);
          return;
        }
      }
      const remembered = await getRememberedPartnerReferral();
      if (!cancelled && remembered) setUsername(remembered);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (!username) return null;

  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-center text-sm text-emerald-950">
      You were referred by partner <span className="font-semibold">@{username}</span>.{" "}
      <Link
        href={partnerReferralSignupPath(username)}
        className="font-semibold underline underline-offset-2"
      >
        Open a salon with their link
      </Link>
    </div>
  );
}
