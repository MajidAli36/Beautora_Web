"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  Globe,
  Mail,
  MessageCircle,
  ShoppingCart,
  Users,
} from "lucide-react";
import { CEO_PAGE } from "@/lib/marketing/ceo-page";
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

type FeatureSlide = {
  kind: "feature";
  id: string;
  eyebrow: string;
  headline: string;
  body: string;
  tagline: string;
  icon: typeof ShoppingCart;
};

type CeoSlide = {
  kind: "ceo";
  id: "ceo";
  eyebrow: string;
  headline: string;
  body: string;
  tagline: string;
};

const CEO_SLIDE: CeoSlide = {
  kind: "ceo",
  id: "ceo",
  eyebrow: CEO_PAGE.ceo.messageTitle,
  headline: CEO_PAGE.ceo.headline,
  body: CEO_PAGE.ceo.message,
  tagline: CEO_PAGE.ceo.focus,
};

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    kind: "feature",
    id: "pos",
    eyebrow: "Point of sale",
    headline: "Checkout that matches the salon floor.",
    body: "Services, retail, and staff attribution in one sale — ready for end-of-day reports without juggling tools.",
    tagline: "POS, invoices, and payments in one place.",
    icon: ShoppingCart,
  },
  {
    kind: "feature",
    id: "booking",
    eyebrow: "Online booking",
    headline: "Clients book themselves — you stay in control.",
    body: "Public store page with services, stylists, and slots. Optional advance payment when you need deposits.",
    tagline: "Your booking link, your rules.",
    icon: CalendarDays,
  },
  {
    kind: "feature",
    id: "queue",
    eyebrow: "Queue & chairs",
    headline: "Walk-ins without the chaos.",
    body: "Issue tokens, assign chairs, and keep the floor ordered when appointments and walk-ins stack up.",
    tagline: "Floor status you can trust.",
    icon: ClipboardList,
  },
  {
    kind: "feature",
    id: "staff",
    eyebrow: "Staff & attendance",
    headline: "Who is on the floor — and who earned it.",
    body: "Schedules, attendance, and sale attribution so payroll and performance stay clear.",
    tagline: "Team ops built for busy days.",
    icon: Users,
  },
  {
    kind: "feature",
    id: "whatsapp",
    eyebrow: "WhatsApp & reports",
    headline: "Follow-ups and numbers that stay connected.",
    body: "Message clients when it matters, and read sales, attendance, and floor reports from the same system.",
    tagline: "One operating system for modern salons.",
    icon: MessageCircle,
  },
];

const SLIDES = [CEO_SLIDE, ...FEATURE_SLIDES] as const;
const FEATURE_START = 1;
const ROTATE_MS = 2000;

type AuthBrandPanelProps = {
  /** Ignored for rotation — login & signup always start on the CEO slide once. */
  slide?: number;
};

export function AuthBrandPanel(_props: AuthBrandPanelProps = {}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  /** After CEO advances once, autoplay stays on feature slides only. */
  const ceoDoneRef = useRef(false);

  const goTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(index, SLIDES.length - 1));
    if (next >= FEATURE_START) ceoDoneRef.current = true;
    setActive(next);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((current) => {
        if (current === 0 && !ceoDoneRef.current) {
          ceoDoneRef.current = true;
          return FEATURE_START;
        }
        if (current === 0) {
          return FEATURE_START;
        }
        const next = current + 1;
        if (next >= SLIDES.length) return FEATURE_START;
        return next;
      });
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, active]);

  const message = SLIDES[active] ?? SLIDES[0];
  const isCeo = message.kind === "ceo";

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
        <div key={message.id} className="auth-slide-panel space-y-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
              {message.eyebrow}
            </p>
            <h1 className="mt-5 max-w-xl font-display text-[1.85rem] font-semibold leading-[1.15] tracking-tight text-white sm:text-4xl lg:text-[2.55rem]">
              {message.headline}
            </h1>
          </div>

          {isCeo ? (
            <div className="flex items-start gap-4">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl ring-1 ring-white/25 sm:size-16">
                <Image
                  src={SYNCOPS.ceo.photo}
                  alt={`${SYNCOPS.ceo.name}, ${SYNCOPS.ceo.role} of ${SYNCOPS.builder.name}`}
                  fill
                  sizes="64px"
                  className="object-cover object-[center_20%]"
                  priority
                />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[15px] font-semibold text-white">{SYNCOPS.ceo.name}</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {SYNCOPS.ceo.role}, {SYNCOPS.builder.name}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Building Beautora and enterprise digital products worldwide.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/15 sm:size-16">
                <message.icon className="size-7 text-[var(--m-accent-soft)]" aria-hidden />
              </div>
              <p className="min-w-0 pt-1 text-sm leading-relaxed text-white/65 sm:text-[15px]">
                {message.body}
              </p>
            </div>
          )}

          {isCeo ? (
            <blockquote className="max-w-lg border-l border-white/15 pl-4 font-display text-[15px] italic leading-relaxed text-white/75 sm:text-base">
              “{message.body}”
            </blockquote>
          ) : null}
        </div>

        {isCeo ? (
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
        ) : (
          <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-white/35">
            Beautora · Salon operating system
          </p>
        )}
      </div>

      <div className="relative z-10 mt-auto hidden items-end justify-between gap-6 px-6 pb-6 sm:flex sm:px-8 lg:px-10">
        <p key={`tag-${message.id}`} className="auth-slide-panel max-w-[16rem] text-xs leading-relaxed text-white/40">
          {message.tagline}
        </p>
        <div className="flex items-center gap-1.5 pb-0.5" role="tablist" aria-label="Auth highlights">
          {SLIDES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={item.eyebrow}
              onClick={() => goTo(i)}
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
