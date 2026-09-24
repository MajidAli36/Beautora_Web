import Link from "next/link";
import { getMarketingTopBarMessage } from "@/lib/marketing/top-bar";

export function SiteTopBar() {
  const message = getMarketingTopBarMessage();

  return (
    <div className="relative z-[60] border-b border-white/10 bg-[var(--m-ink)] text-[var(--m-accent-soft)]">
      <div className="mx-auto flex min-h-8 max-w-6xl items-center justify-center px-3 py-1.5 sm:h-9 sm:px-6 sm:py-0">
        <Link
          href="/pricing"
          className="text-center text-[9px] font-semibold uppercase leading-snug tracking-[0.14em] text-white/90 transition-colors hover:text-white sm:truncate sm:text-[11px] sm:tracking-[0.18em]"
        >
          <span className="sm:hidden">30 DAYS FREE · THEN FROM $10/MO</span>
          <span className="hidden sm:inline">{message}</span>
        </Link>
      </div>
    </div>
  );
}
