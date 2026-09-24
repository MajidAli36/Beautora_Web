"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { scrollMarketingToTop } from "@/components/marketing/marketing-scroll-manager";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";
import { SiteTopBar } from "@/components/marketing/site-top-bar";
import { PartnerAwareSignupLink } from "@/components/partners/partner-aware-signup-link";
import { cn } from "@/lib/utils";

/** Every item is a real indexable page — no hash-only destinations. */
const PRIMARY_NAV = [
  { label: "Product", href: "/salon-management-software" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Stores", href: "/stores" },
  { label: "Discover", href: "/discover" },
  { label: "Shop", href: "/shop" },
  { label: "Videos", href: "/videos" },
] as const;

const MORE_NAV = [
  { label: "Booking", href: "/salon-booking-software" },
  { label: "POS", href: "/salon-pos" },
  { label: "CRM", href: "/salon-crm" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Blog", href: "/blog" },
  { label: "Tools", href: "/tools" },
  { label: "About", href: "/about" },
  { label: "Apps", href: "/apps", badge: "Soon" },
  { label: "Partner", href: "/partner" },
] as const;

const MOBILE_SECTIONS = [
  {
    group: "Product",
    items: [
      ...PRIMARY_NAV,
      { label: "Booking", href: "/salon-booking-software" },
      { label: "POS", href: "/salon-pos" },
      { label: "CRM", href: "/salon-crm" },
      { label: "How it works", href: "/how-it-works" },
      { label: "Apps", href: "/apps", badge: "Soon" },
    ],
  },
  {
    group: "Learn",
    items: [
      { label: "Blog", href: "/blog" },
      { label: "Tools", href: "/tools" },
      { label: "About", href: "/about" },
      { label: "Partner", href: "/partner" },
      { label: "Contact", href: "/contact" },
    ],
  },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function goHome(e: MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setOpen(false);
    setMoreOpen(false);
    if (pathname === "/") {
      if (window.location.hash) {
        window.history.replaceState(null, "", "/");
      }
      scrollMarketingToTop();
      return;
    }
    router.push("/");
    requestAnimationFrame(() => {
      scrollMarketingToTop();
      window.setTimeout(scrollMarketingToTop, 0);
      window.setTimeout(scrollMarketingToTop, 80);
      window.setTimeout(scrollMarketingToTop, 200);
    });
  }

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <SiteTopBar />
      <header className="border-b border-[var(--m-line)] bg-[var(--m-paper)]/95 shadow-[0_8px_24px_-18px_rgba(6,33,29,0.45)] backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:h-16 lg:gap-4">
          <Link
            href="/"
            onClick={goHome}
            className="min-w-0 shrink transition-opacity hover:opacity-90"
            aria-label="Beautora home"
          >
            <BeautoraWordmark
              size="sm"
              priority
              className="gap-1.5 sm:gap-2.5"
              textClassName="text-[var(--m-ink)] text-base sm:text-lg"
            />
          </Link>

          <nav
            className="hidden min-w-0 flex-1 items-center justify-center xl:flex"
            aria-label="Primary"
          >
            <div className="inline-flex items-center gap-1 rounded-full bg-[var(--m-mist)]/80 px-1.5 py-1">
              {PRIMARY_NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors",
                      active
                        ? "bg-white text-[var(--m-ink)] shadow-sm"
                        : "text-[var(--m-ink-soft)] hover:bg-white/70 hover:text-[var(--m-ink)]"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}

              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-4 py-2 text-[13px] font-medium tracking-wide transition-colors",
                    moreOpen
                      ? "bg-white text-[var(--m-ink)] shadow-sm"
                      : "text-[var(--m-ink-soft)] hover:bg-white/70 hover:text-[var(--m-ink)]"
                  )}
                >
                  More
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform duration-150",
                      moreOpen && "rotate-180"
                    )}
                  />
                </button>
                {moreOpen ? (
                  <div
                    role="menu"
                    className="absolute top-[calc(100%+0.5rem)] left-1/2 z-50 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--m-line)] bg-[var(--m-paper)] py-1.5 shadow-[0_16px_40px_-20px_rgba(6,33,29,0.55)]"
                  >
                    {MORE_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 text-sm text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
                      >
                        <span>{item.label}</span>
                        {"badge" in item && item.badge ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </nav>

          {/* Desktop auth */}
          <div className="hidden shrink-0 items-center gap-3 xl:flex">
            <Link
              href="/login"
              className="px-2 text-sm font-medium text-[var(--m-muted)] transition-opacity hover:opacity-75"
            >
              Login
            </Link>
            <PartnerAwareSignupLink className="inline-flex h-10 items-center rounded-full bg-[var(--m-ink)] px-5 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]">
              Start free
            </PartnerAwareSignupLink>
          </div>

          {/* Mobile / tablet: Login + Start free + menu — always visible */}
          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-full px-2.5 text-sm font-semibold text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)] sm:px-3"
            >
              Login
            </Link>
            <PartnerAwareSignupLink className="inline-flex h-9 max-w-[5.75rem] items-center justify-center truncate rounded-full bg-[var(--m-ink)] px-2.5 text-xs font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)] sm:max-w-none sm:px-3.5 sm:text-sm">
              Start free
            </PartnerAwareSignupLink>
            <button
              type="button"
              className="relative z-[1] inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--m-mist)] text-[var(--m-ink)] ring-1 ring-[var(--m-line)]"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id="mobile-nav"
            className="max-h-[min(78dvh,36rem)] overflow-y-auto overscroll-contain border-t border-[var(--m-line)] bg-[var(--m-paper)] px-4 py-4 sm:px-6 xl:hidden"
          >
            <nav className="mx-auto flex max-w-7xl flex-col gap-5" aria-label="Mobile">
              {MOBILE_SECTIONS.map((section) => (
                <div key={section.group}>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
                    {section.group}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex min-h-11 items-center justify-between rounded-lg px-3 text-base font-medium text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
                      >
                        <span>{item.label}</span>
                        {"badge" in item && item.badge ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        ) : null}
      </header>
    </div>
  );
}
