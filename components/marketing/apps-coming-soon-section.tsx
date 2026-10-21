"use client";

import Link from "next/link";
import { Monitor, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

type AppsComingSoonSectionProps = {
  /** Compact homepage block vs full /apps page */
  variant?: "section" | "page";
  className?: string;
};

const APPS = [
  {
    id: "mobile",
    label: "Mobile app",
    platform: "iOS & Android",
    title: "Beautora in your pocket",
    body: "A native app for stylists and owners on the go — planned after the web platform you can use today.",
    highlights: [
      "Push alerts for bookings (planned)",
      "Quick queue glance (planned)",
      "Staff check-in on the floor (planned)",
    ],
    Icon: Smartphone,
    device: "phone" as const,
  },
  {
    id: "desktop",
    label: "Desktop app",
    platform: "Windows & macOS",
    title: "Beautora on your desk",
    body: "A focused desktop workspace for front desk and back office — planned; the full web app is available now.",
    highlights: [
      "Native shortcuts (planned)",
      "Multi-window POS (planned)",
      "Offline-ready shell (planned)",
    ],
    Icon: Monitor,
    device: "desktop" as const,
  },
] as const;

function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--m-accent)]/30 bg-[var(--m-accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--m-ink-soft)]",
        className
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--m-accent)] opacity-40 motion-reduce:hidden" />
        <span className="relative inline-flex size-1.5 rounded-full bg-[var(--m-accent)]" />
      </span>
      Coming soon
    </span>
  );
}

function PhoneMock() {
  return (
    <div
      className="relative mx-auto w-[9.5rem] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none sm:w-[10.5rem]"
      aria-hidden
    >
      <div className="rounded-[1.75rem] border border-[var(--m-ink)]/15 bg-[var(--m-ink)] p-2 shadow-[var(--m-shadow)]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.35rem] bg-[var(--m-mist)]">
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
            <div className="h-4 w-16 rounded-full bg-[var(--m-ink)]/80" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(160deg,#eef1ec_0%,#dfe6e0_100%)]" />
          <div className="absolute inset-x-4 top-10 space-y-2">
            <div className="h-2 w-1/2 rounded-full bg-[var(--m-ink)]/20" />
            <div className="h-16 rounded-xl bg-white/70 shadow-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 rounded-lg bg-white/55" />
              <div className="h-12 rounded-lg bg-white/55" />
            </div>
            <div className="h-10 rounded-lg bg-[var(--m-ink-soft)]/20" />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopMock() {
  return (
    <div
      className="relative mx-auto w-full max-w-[17rem] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none"
      aria-hidden
    >
      <div className="overflow-hidden rounded-t-xl border border-[var(--m-ink)]/15 bg-[var(--m-ink)] shadow-[var(--m-shadow)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <span className="size-2 rounded-full bg-white/25" />
          <span className="size-2 rounded-full bg-white/25" />
          <span className="size-2 rounded-full bg-white/25" />
          <span className="ml-2 h-1.5 flex-1 rounded-full bg-white/10" />
        </div>
        <div className="relative aspect-[16/10] bg-[var(--m-mist)]">
          <div className="absolute inset-3 grid grid-cols-[0.35fr_1fr] gap-2">
            <div className="space-y-1.5 rounded-md bg-[var(--m-ink)]/90 p-2">
              <div className="h-1.5 w-3/4 rounded-full bg-white/20" />
              <div className="h-1.5 w-1/2 rounded-full bg-white/12" />
              <div className="h-1.5 w-2/3 rounded-full bg-white/12" />
            </div>
            <div className="space-y-2">
              <div className="h-6 rounded-md bg-white/80 shadow-sm" />
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-10 rounded bg-white/70" />
                <div className="h-10 rounded bg-white/70" />
                <div className="h-10 rounded bg-[var(--m-ink-soft)]/25" />
              </div>
              <div className="h-14 rounded-md bg-white/65" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-2 w-[70%] rounded-b-md bg-[var(--m-ink)]/80" />
    </div>
  );
}

export function AppsComingSoonSection({
  variant = "section",
  className,
}: AppsComingSoonSectionProps) {
  const isPage = variant === "page";

  return (
    <section
      id="apps"
      className={cn(
        "scroll-mt-28",
        isPage ? "bg-[var(--m-mist)] pb-24 pt-28 sm:pb-28 sm:pt-32" : "m-section bg-[var(--m-mist)]",
        className
      )}
    >
      <div className="m-container">
        <div className={cn(isPage ? "mx-auto max-w-2xl text-center" : "max-w-2xl")}>
          <p className="m-eyebrow">Native apps</p>
          {isPage ? (
            <h1 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight text-[var(--m-ink)]">
              Beautora, wherever your team works.
            </h1>
          ) : (
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight text-[var(--m-ink)]">
              Beautora, wherever your team works.
            </h2>
          )}
          <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">
            Native mobile and desktop apps are on the roadmap. The full web platform is available
            today — same salon, same login.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 lg:grid-cols-2 lg:gap-6">
          {APPS.map((app) => (
            <article
              key={app.id}
              id={app.id}
              className="group relative overflow-hidden border border-[var(--m-line)] bg-[var(--m-card)] p-6 transition-all duration-300 hover:border-[var(--m-ink)]/20 hover:shadow-[var(--m-shadow)] motion-reduce:transition-none sm:p-8"
            >
              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-10 items-center justify-center bg-[var(--m-mist)] text-[var(--m-ink)]">
                    <app.Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--m-ink)]">{app.label}</p>
                    <p className="text-xs text-[var(--m-muted)]">{app.platform}</p>
                  </div>
                </div>
                <ComingSoonBadge />
              </div>

              <div className="relative mt-8 min-h-[11rem] sm:min-h-[12.5rem]">
                {app.device === "phone" ? <PhoneMock /> : <DesktopMock />}
              </div>

              <div className="relative mt-8">
                <h3 className="font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)]">
                  {app.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)] sm:text-base">
                  {app.body}
                </p>
                <ul className="mt-5 space-y-2">
                  {app.highlights.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2.5 text-sm text-[var(--m-body)]"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--m-accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href="/signup" className="m-btn m-btn-primary h-11 px-5">
                    Use web today
                  </Link>
                  <Link
                    href="/contact"
                    className="text-sm font-medium text-[var(--m-ink-soft)] underline-offset-4 hover:underline"
                  >
                    Ask about the roadmap
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!isPage ? (
          <div className="mt-8 border border-[var(--m-line)] bg-[var(--m-card)] px-5 py-4 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--m-ink-soft)]">
                Web
              </p>
              <p className="mt-1 font-display text-xl font-medium text-[var(--m-ink)]">
                Available today
              </p>
              <p className="mt-1 text-sm text-[var(--m-muted)]">
                Run the full salon from any modern browser.
              </p>
            </div>
            <Link
              href="/apps"
              className="mt-4 inline-flex text-sm font-semibold text-[var(--m-ink)] underline-offset-4 hover:underline sm:mt-0"
            >
              View Mobile &amp; Desktop
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/signup" className="m-btn m-btn-primary">
              Start on web now
            </Link>
            <Link href="/features" className="m-btn m-btn-secondary">
              See platform features
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
