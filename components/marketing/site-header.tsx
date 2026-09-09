"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { scrollMarketingToTop } from "@/components/marketing/marketing-scroll-manager";
import { SiteTopBar } from "@/components/marketing/site-top-bar";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "How it works", href: "/#how-it-works", hash: "how-it-works" },
  { label: "Platform", href: "/#platform", hash: "platform" },
  { label: "Pricing", href: "/#pricing", hash: "pricing" },
  { label: "Stores", href: "/stores" },
  { label: "Apps", href: "/apps" },
  { label: "About", href: "/about" },
  { label: "Partner", href: "/partner" },
] as const;

function scrollToHash(hash: string) {
  const el = document.getElementById(hash);
  if (!el) return;
  el.scrollIntoView({ block: "start", behavior: "smooth" });
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function goHome(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setOpen(false);
    if (pathname === "/") {
      if (window.location.hash) {
        window.history.replaceState(null, "", "/");
      }
      scrollMarketingToTop();
      return;
    }
    router.push("/");
    // Fight App Router scroll restoration after navigation
    requestAnimationFrame(() => {
      scrollMarketingToTop();
      window.setTimeout(scrollMarketingToTop, 0);
      window.setTimeout(scrollMarketingToTop, 80);
      window.setTimeout(scrollMarketingToTop, 200);
    });
  }

  function goHash(e: MouseEvent<HTMLAnchorElement>, hash: string) {
    e.preventDefault();
    setOpen(false);
    if (pathname === "/") {
      window.history.pushState(null, "", `/#${hash}`);
      scrollToHash(hash);
      return;
    }
    router.push(`/#${hash}`);
  }

  const solid = !isHome || scrolled || open;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <SiteTopBar />
      <header
        className={cn(
          "transition-[background-color,border-color,height] duration-200 ease-out",
          solid
            ? "border-b border-[var(--m-line)] bg-[var(--m-paper)]/95 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-between px-6 transition-[height] duration-200",
            scrolled ? "h-12 lg:h-14" : "h-14 lg:h-16"
          )}
        >
          <Link
            href="/#top"
            onClick={goHome}
            className={cn(
              "flex flex-col leading-none transition-colors",
              solid ? "text-[var(--m-ink)]" : "text-white"
            )}
          >
            <span className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
              {SYNCOPS.name}
            </span>
            <span
              className={cn(
                "mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em]",
                solid ? "text-[var(--m-muted)]" : "text-white/55"
              )}
            >
              {SYNCOPS.builder.short}
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex lg:gap-9" aria-label="Primary">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={"hash" in item && item.hash ? (e) => goHash(e, item.hash) : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-medium tracking-wide transition-opacity duration-150 hover:opacity-70",
                  solid ? "text-[var(--m-ink-soft)]" : "text-white/90"
                )}
              >
                {item.label}
                {item.href === "/apps" ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      solid
                        ? "bg-[var(--m-accent)]/12 text-[var(--m-accent)]"
                        : "bg-white/15 text-white/90"
                    )}
                  >
                    Soon
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex lg:gap-6">
            <Link
              href="/login"
              className={cn(
                "text-sm font-medium transition-opacity duration-150 hover:opacity-70",
                solid ? "text-[var(--m-muted)]" : "text-white/75"
              )}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className={cn(
                "inline-flex h-10 items-center px-5 text-sm font-semibold tracking-wide transition-all duration-150",
                solid
                  ? "bg-[var(--m-ink)] text-[var(--m-paper)] hover:bg-[var(--m-ink-soft)]"
                  : "bg-white text-[var(--m-ink)] hover:bg-white/90"
              )}
            >
              Start free
            </Link>
          </div>

          <button
            type="button"
            className={cn(
              "inline-flex size-11 items-center justify-center md:hidden",
              solid ? "text-[var(--m-ink)]" : "text-white"
            )}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div
            id="mobile-nav"
            className="border-t border-[var(--m-line)] bg-[var(--m-paper)] px-6 py-5 md:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if ("hash" in item && item.hash) {
                      goHash(e, item.hash);
                    } else {
                      setOpen(false);
                    }
                  }}
                  className="flex min-h-11 items-center justify-between px-1 text-base font-medium text-[var(--m-ink)]"
                >
                  {item.label}
                  {item.href === "/apps" ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                      Coming soon
                    </span>
                  ) : null}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="min-h-11 px-1 py-3 text-base text-[var(--m-muted)]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex h-11 w-full items-center justify-center bg-[var(--m-ink)] text-sm font-semibold text-[var(--m-paper)]"
              >
                Start free
              </Link>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}
