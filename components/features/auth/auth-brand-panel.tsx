"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Globe, Mail } from "lucide-react";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.48 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 7.4c.85 0 1.71.12 2.51.35 1.9-1.32 2.74-1.05 2.74-1.05.55 1.42.2 2.47.1 2.73.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.48A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-5.8c0-1.38-.03-3.16-1.93-3.16-1.93 0-2.23 1.5-2.23 3.06V23h-4V8.5z" />
    </svg>
  );
}

const MESSAGES = [
  {
    eyebrow: "Message from the CEO",
    headline: "Leading with innovation, integrity, and a relentless focus on the future.",
    quote: "Our mission is to deliver solutions that shape the future of beauty businesses.",
    tagline: "AI when you want automation. Humans when you need them.",
  },
  {
    eyebrow: "Built for salon operators",
    headline: "One platform for every chair, every store, every checkout.",
    quote: "Beautora turns the salon floor into a calm, connected operation.",
    tagline: "Booking, POS, staff, and reports — without the clutter.",
  },
  {
    eyebrow: "Enterprise craft, local speed",
    headline: "Software that feels premium on day one — and scales with your brand.",
    quote: "We ship the systems we would want to run our own salons on.",
    tagline: "Open a store in minutes. Run a network for years.",
  },
] as const;

type AuthBrandPanelProps = {
  slide?: 0 | 1 | 2;
};

export function AuthBrandPanel({ slide = 0 }: AuthBrandPanelProps) {
  const [active, setActive] = useState(slide);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setActive(slide);
  }, [slide]);

  const goTo = useCallback((index: 0 | 1 | 2) => {
    setActive(index);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((current) => ((current + 1) % MESSAGES.length) as 0 | 1 | 2);
    }, 7000);
    return () => window.clearInterval(id);
  }, [paused, active]);

  const message = MESSAGES[active] ?? MESSAGES[0];

  return (
    <aside
      className="relative flex min-h-0 flex-col overflow-hidden bg-[var(--m-ink)] text-white max-lg:shrink-0 lg:min-h-full lg:w-[48%]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_10%_-8%,rgba(197,212,206,0.18),transparent_55%),radial-gradient(700px_420px_at_90%_85%,rgba(61,107,95,0.35),transparent_50%)]"
      />

      <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {SYNCOPS.name}
        </Link>
      </div>

      <div className="relative z-10 hidden flex-1 flex-col justify-center px-6 py-10 sm:flex sm:px-8 lg:flex lg:px-12 xl:px-14">
        <div key={active} className="auth-slide-panel space-y-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
              {message.eyebrow}
            </p>
            <h1 className="mt-5 max-w-xl font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.55rem]">
              {message.headline}
            </h1>
          </div>

          <div className="flex items-start gap-4">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/25 sm:size-16">
              <Image
                src={SYNCOPS.ceo.photo}
                alt={`${SYNCOPS.ceo.name}, ${SYNCOPS.ceo.role} of ${SYNCOPS.name}`}
                fill
                sizes="64px"
                className="object-cover object-[center_20%]"
                priority
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="text-[15px] font-semibold text-white">{SYNCOPS.ceo.name}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {SYNCOPS.ceo.role}, {SYNCOPS.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Building Beautora and enterprise digital products worldwide.
              </p>
            </div>
          </div>

          <blockquote className="max-w-lg border-l border-white/15 pl-4 font-display text-[15px] italic leading-relaxed text-white/75 sm:text-base">
            “{message.quote}”
          </blockquote>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <SocialIcon href={SYNCOPS.ceo.links.linkedin} label="LinkedIn">
            <LinkedInIcon className="size-4" />
          </SocialIcon>
          <SocialIcon href={SYNCOPS.ceo.links.website} label="Website">
            <Globe className="size-4" />
          </SocialIcon>
          <SocialIcon href={SYNCOPS.ceo.links.github} label="GitHub">
            <GitHubIcon className="size-4" />
          </SocialIcon>
          <SocialIcon href={`mailto:${SYNCOPS.ceo.links.email}`} label="Email">
            <Mail className="size-4" />
          </SocialIcon>
          <Link
            href="/ceo"
            className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors hover:text-white"
          >
            Full message
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <div className="relative z-10 mt-auto hidden items-end justify-between gap-6 px-6 pb-6 sm:flex sm:px-8 lg:px-10">
        <p key={`tag-${active}`} className="auth-slide-panel max-w-[16rem] text-xs leading-relaxed text-white/40">
          {message.tagline}
        </p>
        <div className="flex items-center gap-1.5 pb-0.5" role="tablist" aria-label="CEO messages">
          {MESSAGES.map((item, i) => (
            <button
              key={item.eyebrow}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={item.eyebrow}
              onClick={() => goTo(i as 0 | 1 | 2)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === active ? "w-6 bg-[var(--m-accent-soft)]" : "w-1.5 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      </div>
    </aside>
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
      className="inline-flex size-9 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </a>
  );
}
