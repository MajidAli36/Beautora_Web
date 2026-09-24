"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getRememberedPartnerReferral,
  rememberPartnerReferral,
} from "@/lib/actions/partners";
import {
  PARTNER_REF_STORAGE_KEY,
  partnerReferralSignupPath,
  validatePartnerUsername,
} from "@/lib/partners/referral";
import { cn } from "@/lib/utils";

type PartnerAwareSignupLinkProps = {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

/** Signup link that keeps any remembered partner ?ref=. */
export function PartnerAwareSignupLink({
  className,
  children = "Sign up",
  onClick,
}: PartnerAwareSignupLinkProps) {
  const [href, setHref] = useState("/signup");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let code: string | null = null;
      try {
        const raw = window.localStorage.getItem(PARTNER_REF_STORAGE_KEY);
        if (raw) {
          const validated = validatePartnerUsername(raw);
          code = validated.ok ? validated.username : null;
        }
      } catch {
        /* ignore */
      }
      if (!code) {
        code = await getRememberedPartnerReferral();
      }
      if (cancelled || !code) return;
      const result = await rememberPartnerReferral(code);
      if (cancelled) return;
      if (result.username) {
        setHref(partnerReferralSignupPath(result.username));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href={href} className={cn(className)} onClick={onClick}>
      {children}
    </Link>
  );
}
