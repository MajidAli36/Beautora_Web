import Link from "next/link";
import { getMarketingTopBarMessage } from "@/lib/marketing/top-bar";

export function SiteTopBar() {
  const message = getMarketingTopBarMessage();

  return (
    <div className="relative z-[60] border-b border-white/10 bg-[var(--m-ink)] text-[var(--m-accent-soft)]">
      <div className="mx-auto flex h-8 max-w-6xl items-center justify-center px-4 sm:h-9 sm:px-6">
        <Link
          href="/#pricing"
          className="truncate text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 transition-colors hover:text-white sm:text-[11px]"
        >
          {message}
        </Link>
      </div>
    </div>
  );
}
