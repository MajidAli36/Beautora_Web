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
    body: "Run queue, check appointments, and keep the floor moving from your phone — built for stylists and owners on the go.",
    highlights: ["Push alerts for bookings", "Quick POS & queue", "Staff check-in on the floor"],
    Icon: Smartphone,
    device: "phone" as const,
  },
  {
    id: "desktop",
    label: "Desktop app",
    platform: "Windows & macOS",
    title: "Beautora on your desk",
    body: "A focused desktop workspace for the front desk and back office — faster checkout, clearer reports, always at hand.",
    highlights: ["Native shortcuts", "Multi-window POS", "Offline-ready shell (planned)"],
    Icon: Monitor,
    device: "desktop" as const,
  },
] as const;

function ComingSoonBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-[var(--m-accent)]/25 bg-[var(--m-accent)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--m-accent)]",
        className
      )}
    >
      <span className="relative flex size-1.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--m-accent)] opacity-40" />
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
      <div className="rounded-[1.75rem] border border-[var(--m-ink)]/15 bg-[var(--m-ink)] p-2 shadow-[0_24px_48px_-20px_rgba(12,31,28,0.55)]">
        <div className="relative overflow-hidden rounded-[1.35rem] bg-[var(--m-mist)] aspect-[9/19]">
          <div className="absolute inset-x-0 top-0 z-10 flex justify-center pt-2">
            <div className="h-4 w-16 rounded-full bg-[var(--m-ink)]/80" />
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(61,107,95,0.35),transparent_55%),linear-gradient(160deg,#eef1ef_0%,#dfe6e3_100%)]" />
          <div className="absolute inset-x-4 top-10 space-y-2">
            <div className="h-2 w-1/2 rounded-full bg-[var(--m-ink)]/20" />
            <div className="h-16 rounded-xl bg-white/70 shadow-sm" />
            <div className="grid grid-cols-2 gap-2">
              <div className="h-12 rounded-lg bg-white/55" />
              <div className="h-12 rounded-lg bg-white/55" />
            </div>
            <div className="h-10 rounded-lg bg-[var(--m-accent)]/25" />
          </div>
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3">
            <div className="h-1 w-10 rounded-full bg-[var(--m-ink)]/25" />
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
      <div className="overflow-hidden rounded-t-xl border border-[var(--m-ink)]/15 bg-[var(--m-ink)] shadow-[0_24px_48px_-20px_rgba(12,31,28,0.55)]">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
          <span className="size-2 rounded-full bg-white/25" />
          <span className="size-2 rounded-full bg-white/25" />
          <span className="size-2 rounded-full bg-white/25" />
          <span className="ml-2 h-1.5 flex-1 rounded-full bg-white/10" />
        </div>
        <div className="relative aspect-[16/10] bg-[var(--m-mist)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_0%,rgba(61,107,95,0.28),transparent_50%),linear-gradient(180deg,#f6f7f5,#e4ebe8)]" />
          <div className="absolute inset-3 grid grid-cols-[0.35fr_1fr] gap-2">
            <div className="rounded-md bg-[var(--m-ink)]/90 p-2 space-y-1.5">
              <div className="h-1.5 w-3/4 rounded-full bg-white/20" />
              <div className="h-1.5 w-1/2 rounded-full bg-white/12" />
              <div className="h-1.5 w-2/3 rounded-full bg-white/12" />
            </div>
            <div className="space-y-2">
              <div className="h-6 rounded-md bg-white/80 shadow-sm" />
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-10 rounded bg-white/70" />
                <div className="h-10 rounded bg-white/70" />
                <div className="h-10 rounded bg-[var(--m-accent)]/30" />
              </div>
              <div className="h-14 rounded-md bg-white/65" />
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto h-2 w-[70%] rounded-b-md bg-[var(--m-ink)]/80" />
      <div className="mx-auto h-1 w-[40%] rounded-b bg-[var(--m-ink)]/50" />
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
        isPage ? "bg-[var(--m-paper)] pb-24 pt-28 sm:pb-28 sm:pt-32" : "bg-[var(--m-paper)] py-24 sm:py-28",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div className={cn(isPage ? "mx-auto max-w-2xl text-center" : "max-w-2xl")}>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Native apps
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            Beautora, wherever your team works.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            Native mobile and desktop apps are coming soon. The web platform is available today —
            same salon, same login.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {APPS.map((app) => (
            <article
              key={app.id}
              id={app.id}
              className="group relative overflow-hidden rounded-2xl border border-[var(--m-line)] bg-white/80 p-6 shadow-none transition-all duration-300 hover:border-[var(--m-accent)]/35 hover:shadow-md motion-reduce:transition-none sm:p-8"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--m-accent)]/[0.06] transition-transform duration-500 group-hover:scale-125 motion-reduce:transform-none" />

              <div className="relative flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--m-mist)] text-[var(--m-ink)]">
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
                      className="flex items-start gap-2.5 text-sm text-[var(--m-ink-soft)]"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--m-accent)]" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span
                    className="inline-flex h-11 cursor-not-allowed items-center rounded-lg border border-[var(--m-line)] bg-[var(--m-mist)]/80 px-5 text-sm font-semibold text-[var(--m-muted)]"
                    aria-disabled="true"
                    title="Coming soon"
                  >
                    Notify me — soon
                  </span>
                  <span className="text-xs text-[var(--m-muted)]">
                    Use the web app today at{" "}
                    <Link href="/signup" className="font-medium text-[var(--m-accent)] hover:underline">
                      Open a store
                    </Link>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!isPage ? (
          <div className="mt-12 border border-[var(--m-line)] bg-white px-6 py-5 text-center sm:flex sm:items-center sm:justify-between sm:text-left">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--m-accent)]">
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
          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center bg-[var(--m-ink)] px-8 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
            >
              Start on web now
            </Link>
            <Link
              href="/platform"
              className="inline-flex h-12 items-center border border-[var(--m-ink)] px-8 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-ink)] hover:text-[var(--m-paper)]"
            >
              See platform features
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
