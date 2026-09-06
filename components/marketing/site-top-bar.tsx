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
          <SocialIcon href={SYNCOPS.social.github} label="GitHub">
            <path d="M12 .3C5.37.3 0 5.67 0 12.3c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.03-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23.96-.27 1.98-.4 3-.4s2.04.13 3 .4c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.82.58C20.56 22.1 24 17.6 24 12.3 24 5.67 18.63.3 12 .3z" />
          </SocialIcon>
          <SocialIcon href={SYNCOPS.social.instagram} label="Instagram">
            <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85C2.38 3.92 3.9 2.38 7.15 2.23 8.42 2.17 8.8 2.16 12 2.16zm0-2.16C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95C23.73 2.69 21.31.27 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.41-11.85a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z" />
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
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex size-7 items-center justify-center text-white/65 transition-colors hover:text-white"
    >
      <svg viewBox="0 0 24 24" className="size-3.5 fill-current" aria-hidden>
        {children}
      </svg>
    </a>
  );
}
