"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ClipboardList,
  Globe,
  Mail,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";
import { BEAUTORA_PRODUCT_PAIR, BEAUTORA_PRODUCTS } from "@/lib/marketing/products";
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
  points: string[];
  icon: typeof ShoppingCart;
};

type CeoSlide = {
  kind: "ceo";
  id: "ceo";
  eyebrow: string;
  headline: string;
  body: string;
  tagline: string;
  points: string[];
};

/** Auth-only short copy — keeps the left panel viewport-fit (no scroll). */
const CEO_SLIDE: CeoSlide = {
  kind: "ceo",
  id: "ceo",
  eyebrow: "Message from the CEO",
  headline: "Built to last.",
  body: "Partnerships over features — Salon Management, POS & Marketplace.",
  tagline: "Booking → POS → Marketplace COD.",
  points: ["Salon POS", "Marketplace shop", "One workspace", "Beauty-first"],
};

const FEATURE_SLIDES: FeatureSlide[] = [
  {
    kind: "feature",
    id: "pos",
    eyebrow: "Salon POS",
    headline: "Checkout for the floor.",
    body: "Services, retail, and staff credit in one sale.",
    tagline: "Invoices & payments — one place.",
    icon: ShoppingCart,
    points: ["One ticket", "Staff credit", "Cash & card", "End-of-day"],
  },
  {
    kind: "feature",
    id: "marketplace",
    eyebrow: BEAUTORA_PRODUCTS.marketplace.name,
    headline: "Sell products online.",
    body: "COD shop orders — separate from salon POS money.",
    tagline: `${BEAUTORA_PRODUCT_PAIR.title} — switch anytime.`,
    icon: ShoppingBag,
    points: ["Public shop", "Seller stock", "COD orders", "Commissions"],
  },
  {
    kind: "feature",
    id: "booking",
    eyebrow: "Online booking",
    headline: "Clients book themselves.",
    body: "Services, stylists, slots — optional deposits.",
    tagline: "Your booking link, your rules.",
    icon: CalendarDays,
    points: ["Public page", "Pick stylist", "Deposits", "Into POS"],
  },
  {
    kind: "feature",
    id: "queue",
    eyebrow: "Queue & chairs",
    headline: "Walk-ins, ordered.",
    body: "Tokens and chairs when the floor gets busy.",
    tagline: "Floor status you can trust.",
    icon: ClipboardList,
    points: ["Walk-in tokens", "Chair assign", "Mix bookings", "Live desk"],
  },
  {
    kind: "feature",
    id: "staff",
    eyebrow: "Staff & attendance",
    headline: "Who earned it.",
    body: "Rosters, check-in, and sale attribution.",
    tagline: "Team ops for busy days.",
    icon: Users,
    points: ["Schedules", "Attendance", "Sale credit", "Payroll view"],
  },
  {
    kind: "feature",
    id: "whatsapp",
    eyebrow: "WhatsApp & reports",
    headline: "Follow-ups & numbers.",
    body: "Client messages plus sales and floor reports.",
    tagline: `${BEAUTORA_PRODUCT_PAIR.title} in one workspace.`,
    icon: MessageCircle,
    points: ["WhatsApp", "Sales reports", "Feedback", "Owner view"],
  },
];

const SLIDES = [CEO_SLIDE, ...FEATURE_SLIDES] as const;
const ROTATE_MS = 3000;

type AuthBrandPanelProps = {
  /** Ignored for rotation — login & signup always start on the CEO slide. */
  slide?: number;
};

export function AuthBrandPanel(_props: AuthBrandPanelProps = {}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback((index: number) => {
    setActive(Math.max(0, Math.min(index, SLIDES.length - 1)));
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, active]);

  const message = SLIDES[active] ?? SLIDES[0];
  const isCeo = message.kind === "ceo";

  return (
    <aside
      className="auth-brand relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[var(--m-ink)] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_520px_at_10%_-8%,rgba(197,212,206,0.18),transparent_55%),radial-gradient(700px_420px_at_90%_85%,rgba(61,107,95,0.35),transparent_50%)]"
      />

      <div className="relative z-10 flex shrink-0 items-center justify-between px-[clamp(1.25rem,3vw,2.25rem)] py-[clamp(0.65rem,1.6vh,1rem)]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Link href="/" className="transition-opacity hover:opacity-90" aria-label="Beautora home">
          <BeautoraWordmark size="sm" textClassName="text-white" />
        </Link>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-[clamp(1.25rem,3vw,2.5rem)] pb-[clamp(0.75rem,2vh,1.25rem)]">
        <div
          key={message.id}
          className="auth-slide-panel flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col justify-center gap-[clamp(0.65rem,1.8vh,1.1rem)] overflow-hidden">
            <div>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent-soft)]">
                {message.eyebrow}
              </p>
              <h1 className="mt-2 max-w-[18ch] font-display font-semibold leading-[1.1] tracking-tight text-white [font-size:clamp(1.55rem,2.4vw+0.35rem,2.15rem)]">
                {message.headline}
              </h1>
            </div>

            {isCeo ? (
              <div className="flex items-center gap-3">
                <div className="relative size-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/25">
                  <Image
                    src={SYNCOPS.ceo.photo}
                    alt={`${SYNCOPS.ceo.name}, ${SYNCOPS.ceo.role} of ${SYNCOPS.builder.name}`}
                    fill
                    sizes="44px"
                    className="object-cover object-[center_20%]"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{SYNCOPS.ceo.name}</p>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white/45">
                    {SYNCOPS.ceo.role}, {SYNCOPS.builder.name}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/15">
                  <message.icon className="size-5 text-[var(--m-accent-soft)]" aria-hidden />
                </div>
                <p className="min-w-0 pt-1.5 text-sm leading-snug text-white/65">{message.body}</p>
              </div>
            )}

            {isCeo ? (
              <p className="max-w-[36ch] text-sm leading-snug text-white/70">{message.body}</p>
            ) : null}

            {isCeo ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <SocialIcon href={SYNCOPS.ceo.links.linkedin} label="LinkedIn">
                  <LinkedInIcon className="size-3" />
                </SocialIcon>
                <SocialIcon href={SYNCOPS.ceo.links.website} label="Website">
                  <Globe className="size-3" />
                </SocialIcon>
                <SocialIcon href={SYNCOPS.ceo.links.github} label="GitHub">
                  <GitHubIcon className="size-3" />
                </SocialIcon>
                <SocialIcon href={`mailto:${SYNCOPS.ceo.links.email}`} label="Email">
                  <Mail className="size-3" />
                </SocialIcon>
                <Link
                  href="/ceo"
                  className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
                >
                  Full message
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            ) : null}

            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {message.points.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <span className="inline-flex size-3.5 shrink-0 items-center justify-center bg-[var(--m-accent)]/40 text-[var(--m-accent-soft)]">
                    <Check className="size-2 stroke-[3]" aria-hidden />
                  </span>
                  <span className="text-[0.8125rem] leading-tight text-white/80">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 items-end justify-between gap-3 pt-1">
            <p
              key={`tag-${message.id}`}
              className="auth-slide-panel max-w-[16rem] text-[0.7rem] leading-snug text-white/40"
            >
              {message.tagline}
            </p>
            <div
              className="flex shrink-0 items-center gap-1.5 pb-0.5"
              role="tablist"
              aria-label="Auth highlights"
            >
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
                    i === active
                      ? "w-5 bg-[var(--m-accent-soft)]"
                      : "w-1.5 bg-white/30 hover:bg-white/50"
                  )}
                />
              ))}
            </div>
          </div>
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
      className="inline-flex size-7 items-center justify-center rounded-full bg-white/5 text-white/70 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </a>
  );
}
