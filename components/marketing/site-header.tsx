"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { scrollMarketingToTop } from "@/components/marketing/marketing-scroll-manager";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";
import { PartnerAwareSignupLink } from "@/components/partners/partner-aware-signup-link";
import { cn } from "@/lib/utils";

/** Every item is a real indexable page — no hash-only destinations. */
const PRIMARY_NAV = [
  { label: "Product", href: "/salon-management-software" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Stores", href: "/stores" },
  { label: "Shop", href: "/shop" },
] as const;

/** Mid-width bar — key links only so Login / Start free never collide. */
const COMPACT_NAV = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Stores", href: "/stores" },
  { label: "Shop", href: "/shop" },
] as const;

function navItemClass(active: boolean) {
  return cn(
    "rounded-sm px-2 py-2 text-[13px] font-medium tracking-wide whitespace-nowrap transition-colors lg:px-2.5",
    active
      ? "text-[var(--m-ink)] underline decoration-[var(--m-accent)] decoration-2 underline-offset-[10px]"
      : "text-[var(--m-ink-soft)] hover:text-[var(--m-ink)]"
  );
}

const MORE_NAV = [
  { label: "Discover", href: "/discover" },
  { label: "Videos", href: "/videos" },
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
      { label: "Discover", href: "/discover" },
      { label: "Videos", href: "/videos" },
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
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavId = useId();

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
        if (open) {
          setOpen(false);
          menuButtonRef.current?.focus();
        }
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

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
    <header className="sticky top-0 z-50 h-14 border-b border-[var(--m-line)] bg-[var(--m-paper)] shadow-[0_8px_24px_-18px_rgba(7,59,50,0.4)] lg:h-16">
        {/*
          In-flow sticky header (not fixed): occupies document height so the hero
          starts below it and never paints behind the nav.
          3-column grid: logo | nav | actions.
        */}
        <div className="relative mx-auto grid h-full w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 sm:px-6">
          <Link
            href="/"
            onClick={goHome}
            className="min-w-0 justify-self-start rounded-sm transition-opacity hover:opacity-90"
            aria-label="Beautora home"
          >
            <BeautoraWordmark
              size="sm"
              priority
              className="gap-1.5 sm:gap-2.5"
              textClassName="text-[var(--m-ink)] text-base sm:text-lg"
            />
          </Link>

          {/* Compact main links — lg to 2xl */}
          <nav
            className="hidden min-w-0 items-center justify-center overflow-hidden lg:flex 2xl:hidden"
            aria-label="Primary"
          >
            <div className="flex items-center gap-0.5">
              {COMPACT_NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={navItemClass(active)}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Full nav + More — 2xl+ */}
          <nav
            className="hidden items-center justify-center 2xl:flex"
            aria-label="Primary"
          >
            <div className="flex items-center gap-0.5">
              {PRIMARY_NAV.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href} className={navItemClass(active)}>
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
                    "inline-flex items-center gap-1 rounded-sm px-2.5 py-2 text-[13px] font-medium tracking-wide whitespace-nowrap transition-colors",
                    moreOpen
                      ? "text-[var(--m-ink)]"
                      : "text-[var(--m-ink-soft)] hover:text-[var(--m-ink)]"
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
                    className="absolute top-[calc(100%+0.5rem)] left-1/2 z-50 w-56 -translate-x-1/2 overflow-hidden border border-[var(--m-line)] bg-[var(--m-card)] py-1.5 shadow-[var(--m-shadow)]"
                  >
                    {MORE_NAV.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2.5 text-sm text-[var(--m-body)] transition-colors hover:bg-[var(--m-mist)] hover:text-[var(--m-ink)]"
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

          {/* Spacer when both desktop navs are hidden (below lg) */}
          <div className="lg:hidden" aria-hidden />

          <div className="flex items-center justify-self-end gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-sm px-2 text-sm font-medium text-[var(--m-muted)] transition-colors hover:text-[var(--m-ink)]"
            >
              Login
            </Link>
            <PartnerAwareSignupLink className="m-btn m-btn-primary h-9 px-3.5 text-sm sm:h-10 sm:px-5">
              Start free
            </PartnerAwareSignupLink>
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-sm bg-[var(--m-mist)] text-[var(--m-ink)] ring-1 ring-[var(--m-line)] 2xl:hidden"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-controls={mobileNavId}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id={mobileNavId}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute inset-x-0 top-full max-h-[min(78dvh,36rem)] overflow-y-auto overscroll-contain border-b border-t border-[var(--m-line)] bg-[var(--m-paper)] px-4 py-4 shadow-[var(--m-shadow)] sm:px-6 2xl:hidden"
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
                        className="flex min-h-11 items-center justify-between rounded-sm px-3 text-base font-medium text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
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
  );
}
