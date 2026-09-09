"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

function isInternalAppNav(anchor: HTMLAnchorElement, currentPath: string) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  if (anchor.getAttribute("data-no-nav-loader") != null) return false;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }

  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    const currentSearch = window.location.search;
    if (url.pathname === currentPath && url.search === currentSearch) return false;
    return true;
  } catch {
    return false;
  }
}

/** Full-area loader while dashboard sidebar / in-app links navigate. */
export function NavigationLoader() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [visible, setVisible] = useState(false);
  const safetyRef = useRef<number | null>(null);

  // Hide loader when the new route is ready; on mobile also ensure nav sheet is closed
  useEffect(() => {
    setVisible(false);
    if (safetyRef.current != null) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
    if (isMobile) {
      setOpenMobile(false);
    }
    // Only react to route changes — do not depend on openMobile (would close menu on open)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function armLoader() {
      setVisible(true);
      if (safetyRef.current != null) window.clearTimeout(safetyRef.current);
      // Failsafe if navigation is cancelled / blocked
      safetyRef.current = window.setTimeout(() => setVisible(false), 12000);
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!isInternalAppNav(anchor, pathname)) return;

      // Mobile only: close the slide-out navbar so the page + loader are visible
      if (isMobile) {
        setOpenMobile(false);
      }

      armLoader();
    }

    function onPopState() {
      if (isMobile) {
        setOpenMobile(false);
      }
      armLoader();
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      if (safetyRef.current != null) window.clearTimeout(safetyRef.current);
    };
  }, [pathname, isMobile, setOpenMobile]);

  return (
    <div
      aria-hidden={!visible}
      aria-busy={visible}
      className={cn(
        "pointer-events-none absolute inset-0 z-40 flex flex-col transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-primary/15",
          visible ? "block" : "hidden"
        )}
      >
        <div className="app-nav-progress h-full w-1/3 bg-primary" />
      </div>

      <div
        className={cn(
          "flex flex-1 items-center justify-center bg-background/75 backdrop-blur-[2px]",
          visible ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        {visible ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/80 bg-card px-6 py-5 shadow-sm">
            <Loader2 className="size-7 animate-spin text-primary" aria-hidden />
            <p className="text-sm font-medium text-foreground">Loading…</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
