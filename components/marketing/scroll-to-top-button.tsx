"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { scrollMarketingToTop } from "@/components/marketing/marketing-scroll-manager";
import { cn } from "@/lib/utils";

type ScrollToTopButtonProps = {
  className?: string;
  /** Pixels scrolled before the button appears */
  threshold?: number;
};

export function ScrollToTopButton({
  className,
  threshold = 280,
}: ScrollToTopButtonProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > threshold);
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
      className={cn(
        "fixed z-50 inline-flex size-11 items-center justify-center rounded-full border border-[var(--m-line)] bg-[var(--m-ink)] text-[var(--m-paper)] shadow-lg transition-all duration-200",
        "bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(5.75rem+env(safe-area-inset-right,0px))]",
        "hover:bg-[var(--m-ink-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--m-accent)] focus-visible:ring-offset-2",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
        className
      )}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
