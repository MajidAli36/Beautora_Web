"use client";

import { useEffect, useState } from "react";
import { scrollMarketingToTop } from "@/components/marketing/marketing-scroll-manager";
import { cn } from "@/lib/utils";

type ScrollToTopButtonProps = {
  className?: string;
  /** Pixels scrolled before the button appears */
  threshold?: number;
};

/** Reliable up-chevron — avoids Lucide icon glitches on the marketing chrome. */
function UpArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 19V5M12 5l-6 6M12 5l6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ScrollToTopButton({
  className,
  threshold = 280,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      setVisible(y > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  function scrollTop() {
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname || "/");
    }
    scrollMarketingToTop();
  }

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Back to top"
      title="Back to top"
      className={cn(
        "fixed z-[60] inline-flex size-12 items-center justify-center rounded-full",
        "border border-white/20 bg-[var(--m-ink)] text-white shadow-[0_10px_30px_rgba(6,33,29,0.35)]",
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(6.5rem+env(safe-area-inset-right,0px))]",
        "transition-all duration-200 hover:bg-[var(--m-ink-soft)] hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent)] focus-visible:ring-offset-2",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
        className
      )}
    >
      <UpArrowIcon className="size-5 shrink-0" />
    </button>
  );
}
