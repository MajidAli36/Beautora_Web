"use client";

import { useEffect, useState } from "react";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

const ROTATE_MS = 3000;

const SLIDES = [
  {
    id: "appointments",
    badge: "Live floor",
    title: "Today's appointments",
    footer: "Appointments, queue, and POS stay connected for the floor.",
    rows: [
      { left: "10:00", title: "Sara", sub: "Haircut", right: "Confirmed", tone: "ok" as const },
      { left: "11:00", title: "Ayesha", sub: "Facial", right: "Confirmed", tone: "ok" as const },
      { left: "12:30", title: "Hina", sub: "Hair Color", right: "Waiting", tone: "wait" as const },
    ],
  },
  {
    id: "queue",
    badge: "Walk-ins",
    title: "Queue board",
    footer: "Tokens, chairs, and wait times — without paper tickets.",
    rows: [
      { left: "#104", title: "Walk-in", sub: "Manicure · Chair 1", right: "Serving", tone: "ok" as const },
      { left: "#105", title: "Walk-in", sub: "Haircut · Waiting", right: "3 min", tone: "wait" as const },
      { left: "#106", title: "Walk-in", sub: "Beard trim", right: "8 min", tone: "wait" as const },
    ],
  },
  {
    id: "pos",
    badge: "Checkout",
    title: "POS sale",
    footer: "Services, retail, and staff on one ticket.",
    rows: [
      { left: "1×", title: "Signature Haircut", sub: "Amna", right: "Rs 1,500", tone: "ok" as const },
      { left: "1×", title: "Repair Serum", sub: "Retail", right: "Rs 2,200", tone: "ok" as const },
      { left: "Due", title: "Total", sub: "Cash", right: "Rs 3,700", tone: "ok" as const },
    ],
  },
  {
    id: "staff",
    badge: "Team",
    title: "Staff on floor",
    footer: "Know who is free before the next booking lands.",
    rows: [
      { left: "09:02", title: "Amna", sub: "Senior stylist", right: "On floor", tone: "ok" as const },
      { left: "09:08", title: "Bilal", sub: "Colorist", right: "Break", tone: "wait" as const },
      { left: "09:15", title: "Sana", sub: "Reception", right: "On floor", tone: "ok" as const },
    ],
  },
  {
    id: "sales",
    badge: "Today",
    title: "Sales pulse",
    footer: "Cash, JazzCash, and open balances at a glance.",
    rows: [
      { left: "Cash", title: "Collected", sub: "Front desk", right: "Rs 42k", tone: "ok" as const },
      { left: "Jazz", title: "Transfers", sub: "Approved", right: "Rs 28k", tone: "ok" as const },
      { left: "Due", title: "Outstanding", sub: "2 invoices", right: "Rs 6k", tone: "wait" as const },
    ],
  },
] as const;

export function HeroProductWidget() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setFade(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % SLIDES.length);
        setFade(true);
      }, 180);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = SLIDES[index] ?? SLIDES[0];

  return (
    <aside
      className="m-fade-up m-fade-up-delay-2 relative mx-auto w-full max-w-md lg:mx-0 lg:justify-self-end"
      aria-label={`${SYNCOPS.name} product preview`}
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="border border-white/15 bg-[var(--m-paper)]/95 p-5 text-[var(--m-ink)] shadow-[0_28px_60px_-28px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-6">
        <div
          className={cn(
            "transition-opacity duration-200 ease-out motion-reduce:transition-none",
            fade ? "opacity-100" : "opacity-0"
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--m-line)] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
                {SYNCOPS.name}
              </p>
              <p className="mt-1 font-display text-xl font-semibold tracking-tight">
                {slide.title}
              </p>
            </div>
            <span className="shrink-0 border border-[var(--m-line)] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--m-muted)]">
              {slide.badge}
            </span>
          </div>

          <ul className="mt-1 divide-y divide-[var(--m-line)]">
            {slide.rows.map((row) => (
              <li
                key={`${slide.id}-${row.left}-${row.title}`}
                className="flex items-center gap-3 py-3.5 text-sm"
              >
                <span className="w-12 shrink-0 tabular-nums text-[var(--m-muted)]">
                  {row.left}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[var(--m-ink)]">{row.title}</span>
                  <span className="block text-xs text-[var(--m-muted)]">{row.sub}</span>
                </span>
                <span
                  className={
                    row.tone === "wait"
                      ? "shrink-0 text-[11px] font-medium text-amber-800"
                      : "shrink-0 text-[11px] font-medium text-[var(--m-accent)]"
                  }
                >
                  {row.right}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 border-t border-[var(--m-line)] pt-3 text-[11px] text-[var(--m-muted)]">
            {slide.footer}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="Preview slides">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show ${s.title}`}
                onClick={() => {
                  setFade(false);
                  window.setTimeout(() => {
                    setIndex(i);
                    setFade(true);
                  }, 120);
                }}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === index
                    ? "w-5 bg-[var(--m-ink)]"
                    : "w-1.5 bg-[var(--m-ink)]/25 hover:bg-[var(--m-ink)]/45"
                )}
              />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--m-muted)]">
            {paused ? "Paused" : "Auto"}
          </p>
        </div>
      </div>
    </aside>
  );
}
