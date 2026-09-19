import Link from "next/link";
import { HowItWorksVideo } from "@/components/marketing/how-it-works-video";

const STEPS = [
  {
    step: "01",
    title: "Open your store",
    body: "Create your Beautora account, name your salon, and invite owners or managers.",
  },
  {
    step: "02",
    title: "Set the floor",
    body: "Add services, products, chairs, staff, schedules, booking rules — and Marketplace listings when you sell online.",
  },
  {
    step: "03",
    title: "Run every day",
    body: "Manage bookings, walk-ins, salon POS, staff, customers, Marketplace orders, WhatsApp, and reports from one workspace.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="scroll-mt-28 bg-[var(--m-mist)] py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-end lg:gap-14">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              How it works
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
              Watch Beautora go live.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
              A short walkthrough — from empty store to bookings, salon POS, and Marketplace —
              without a month of setup theatre.
            </p>
          </div>

          <ol className="grid gap-6 sm:grid-cols-3 lg:gap-5">
            {STEPS.map((item) => (
              <li key={item.step}>
                <p className="font-display text-2xl font-semibold text-[var(--m-accent)]">
                  {item.step}
                </p>
                <h3 className="mt-2 font-display text-xl font-medium text-[var(--m-ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--m-muted)]">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative mt-12 sm:mt-14">
          <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(61,107,95,0.14),transparent_68%)] sm:-inset-x-8" />
          <HowItWorksVideo className="shadow-[0_40px_80px_-48px_rgba(6,33,29,0.65)]" />
        </div>

        <div className="mt-10 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--m-muted)]">
            Same product you just watched — live on the web today.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center bg-[var(--m-ink)] px-7 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-all duration-150 hover:bg-[var(--m-ink-soft)]"
            >
              Create your store
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center border border-[var(--m-ink)]/20 px-7 text-sm font-medium tracking-wide text-[var(--m-ink)] transition-all duration-150 hover:border-[var(--m-ink)] hover:bg-white"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
