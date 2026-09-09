"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Jump to the absolute top of the document (hero). */
export function scrollMarketingToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function applyHomeScrollFromHash() {
  if (typeof window === "undefined") return;
  const hash = window.location.hash;
  if (!hash || hash === "#" || hash === "#top") {
    scrollMarketingToTop();
    return;
  }
  const id = decodeURIComponent(hash.slice(1));
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ block: "start", behavior: "auto" });
  }
}

/**
 * Prevent the browser / App Router from restoring a mid-page scroll when
 * returning to `/` (e.g. after hash nav or logo click).
 */
export function MarketingScrollManager() {
  const pathname = usePathname();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    applyHomeScrollFromHash();
    const t0 = window.setTimeout(applyHomeScrollFromHash, 0);
    const t1 = window.setTimeout(applyHomeScrollFromHash, 50);
    const t2 = window.setTimeout(applyHomeScrollFromHash, 150);

    const onHashChange = () => applyHomeScrollFromHash();
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [pathname]);

  return null;
}
