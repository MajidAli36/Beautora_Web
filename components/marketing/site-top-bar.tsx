"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMarketingTopBarSlides } from "@/lib/marketing/top-bar";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

const ROTATE_MS = 5500;

export function SiteTopBar() {
  const slides = getMarketingTopBarSlides();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [slides.length]);

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;

  return (
    <div className="relative z-[60] border-b border-white/10 bg-[var(--m-ink)] text-[var(--m-accent-soft)]">
      <div className="mx-auto flex h-9 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
              slide.kind === "alert"
                ? "bg-amber-400/20 text-amber-200"
                : slide.kind === "ceo"
                  ? "bg-white/10 text-white/85"
                  : "bg-[var(--m-accent)]/30 text-[var(--m-accent-soft)]"
            )}
          >
            {slide.label}
          </span>
          {slide.href ? (
            <Link
              href={slide.href}
              className="m-topbar-fade truncate text-xs text-white/90 transition-opacity hover:text-white sm:text-[13px]"
              key={slide.id}
            >
              {slide.text}
            </Link>
          ) : (
            <p
              key={slide.id}
              className="m-topbar-fade truncate text-xs text-white/90 sm:text-[13px]"
            >
              {slide.text}
            </p>
          )}
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show: ${s.label}`}
              onClick={() => setIndex(i)}
              className={cn(
                "size-1.5 rounded-full transition-colors",
                i === index ? "bg-white" : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 border-l border-white/15 pl-3">
          <SocialIcon href={SYNCOPS.social.linkedin} label="LinkedIn">
            <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V24h-4V8.5zM8.5 8.5h3.84v2.11h.05c.53-1.01 1.84-2.07 3.79-2.07 4.05 0 4.8 2.67 4.8 6.14V24h-4v-7.56c0-1.8-.03-4.12-2.51-4.12-2.51 0-2.89 1.96-2.89 3.99V24h-4V8.5z" />
          </SocialIcon>
          <SocialIcon href={SYNCOPS.social.website} label="Website">
            <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 2c1.7 0 3.26.53 4.54 1.43L14.1 8.87A3.98 3.98 0 0012 8.5c-.73 0-1.41.2-2 .54L7.46 5.43A7.96 7.96 0 0112 4zm-6.57 2.46l2.54 2.54A4.01 4.01 0 007.5 12c0 .73.2 1.41.54 2L5.43 16.54A7.96 7.96 0 014 12c0-2.1.81-4.02 2.43-5.54zM12 20a7.96 7.96 0 01-4.54-1.43l2.54-2.54c.59.34 1.27.54 2 .54.73 0 1.41-.2 2-.54l2.54 2.54A7.96 7.96 0 0112 20zm4.57-3.46L14.03 14A4.01 4.01 0 0016.5 12c0-.73-.2-1.41-.54-2l2.61-2.54A7.96 7.96 0 0120 12a7.96 7.96 0 01-3.43 6.54zM12 9.5A2.5 2.5 0 119.5 12 2.5 2.5 0 0112 9.5z" />
          </SocialIcon>
          <SocialIcon href={SYNCOPS.social.github} label="GitHub">
            <path d="M12 .3C5.37.3 0 5.67 0 12.3c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.03-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.82.58C20.56 22.1 24 17.6 24 12.3 24 5.67 18.63.3 12 .3z" />
          </SocialIcon>
          <SocialIcon href={`mailto:${SYNCOPS.social.email}`} label="Email">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
          </SocialIcon>
          <Link
            href="/syncops"
            className="ml-1 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80 transition-colors hover:text-white md:inline"
          >
            SyncOps
          </Link>
          <span className="hidden text-white/25 md:inline" aria-hidden>
            |
          </span>
          <Link
            href="/ceo"
            className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--m-accent-soft)] transition-colors hover:text-white md:inline"
          >
            CEO
          </Link>
        </div>
      </div>
    </div>
  );
}

function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  const external = !href.startsWith("mailto:");
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      className="inline-flex size-7 items-center justify-center text-white/65 transition-colors hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
