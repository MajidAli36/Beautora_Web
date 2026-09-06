"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteTopBar } from "@/components/marketing/site-top-bar";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Platform", href: "/#platform" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Stores", href: "/stores" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !isHome || scrolled || open;

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <SiteTopBar />
      <header
        className={cn(
          "transition-[background-color,border-color,backdrop-filter] duration-300",
          solid
            ? "border-b border-[var(--m-line)] bg-[var(--m-paper)]/92 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:h-16">
          <Link
            href="/"
            className={cn(
              "font-display text-xl font-semibold tracking-tight transition-colors sm:text-2xl",
              solid ? "text-[var(--m-ink)]" : "text-white"
            )}
          >
            {SYNCOPS.name}
          </Link>

          <nav className="hidden items-center gap-8 md:flex lg:gap-10">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium tracking-wide transition-opacity hover:opacity-70",
                  solid ? "text-[var(--m-ink-soft)]" : "text-white/90"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex lg:gap-6">
            <Link
              href="/login"
              className={cn(
                "text-sm font-medium transition-opacity hover:opacity-70",
                solid ? "text-[var(--m-muted)]" : "text-white/75"
              )}
            >
              Login
            </Link>
            <Link
              href="/signup"
              className={cn(
                "inline-flex h-10 items-center px-5 text-sm font-semibold tracking-wide transition-colors",
                solid
                  ? "bg-[var(--m-ink)] text-[var(--m-paper)] hover:bg-[var(--m-ink-soft)]"
                  : "bg-white text-[var(--m-ink)] hover:bg-white/90"
              )}
            >
              Open a store
            </Link>
          </div>

          <button
            type="button"
            className={cn(
              "inline-flex size-11 items-center justify-center rounded-lg md:hidden",
              solid ? "text-[var(--m-ink)]" : "text-white"
            )}
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-[var(--m-line)] bg-[var(--m-paper)] px-6 py-5 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2 py-3 text-base font-medium text-[var(--m-ink)]"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-base text-[var(--m-muted)]"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center bg-[var(--m-ink)] text-sm font-semibold text-[var(--m-paper)]"
              >
                Open a store
              </Link>
            </nav>
          </div>
        )}
      </header>
    </div>
  );
}
