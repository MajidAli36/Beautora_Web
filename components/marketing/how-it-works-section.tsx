"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { BookOpen, Clapperboard } from "lucide-react";
import { HowItWorksVideo } from "@/components/marketing/how-it-works-video";
import {
  HOW_IT_WORKS_LANGUAGES,
  HOW_IT_WORKS_TUTORIAL_STEPS,
} from "@/lib/marketing/how-it-works-video";
import { cn } from "@/lib/utils";

type MainTab = "walkthrough" | "tutorial";

const OVERVIEW_STEPS = [
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
  const [mainTab, setMainTab] = useState<MainTab>("walkthrough");
  const [langId, setLangId] = useState(HOW_IT_WORKS_LANGUAGES[0]?.id ?? "en");

  const activeLang = useMemo(
    () => HOW_IT_WORKS_LANGUAGES.find((l) => l.id === langId) ?? HOW_IT_WORKS_LANGUAGES[0]!,
    [langId]
  );

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
              Pick a language walkthrough — or follow the written tutorial step by step.
            </p>
          </div>

          <ol className="grid gap-6 sm:grid-cols-3 lg:gap-5">
            {OVERVIEW_STEPS.map((item) => (
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

        {/* Mode tabs: Walkthrough | Tutorial */}
        <div
          role="tablist"
          aria-label="How it works mode"
          className="mt-12 flex flex-wrap gap-2 border-b border-[var(--m-line)] pb-0 sm:mt-14"
        >
          <ModeTab
            active={mainTab === "walkthrough"}
            onClick={() => setMainTab("walkthrough")}
            icon={<Clapperboard className="size-4" />}
            label="Walkthrough"
          />
          <ModeTab
            active={mainTab === "tutorial"}
            onClick={() => setMainTab("tutorial")}
            icon={<BookOpen className="size-4" />}
            label="Tutorial"
          />
        </div>

        {mainTab === "walkthrough" ? (
          <div className="mt-6 space-y-5">
            <div
              role="tablist"
              aria-label="Walkthrough language"
              className="flex flex-wrap gap-2"
            >
              {HOW_IT_WORKS_LANGUAGES.map((lang) => {
                const active = lang.id === activeLang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setLangId(lang.id)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 px-4 text-sm font-medium tracking-wide transition-colors",
                      active
                        ? "bg-[var(--m-ink)] text-[var(--m-paper)]"
                        : "border border-[var(--m-line)] bg-white text-[var(--m-ink)] hover:border-[var(--m-ink)]/40"
                    )}
                  >
                    <span>{lang.label}</span>
                    {lang.nativeLabel ? (
                      <span
                        lang={lang.lang}
                        dir={lang.dir}
                        className={cn(
                          "text-xs",
                          active ? "text-white/70" : "text-[var(--m-muted)]"
                        )}
                      >
                        {lang.nativeLabel}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-x-4 -inset-y-4 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(61,107,95,0.14),transparent_68%)] sm:-inset-x-8" />
              <HowItWorksVideo
                source={activeLang}
                sourceKey={activeLang.id}
                className="shadow-[0_40px_80px_-48px_rgba(6,33,29,0.65)]"
              />
            </div>
            <p className="text-sm text-[var(--m-muted)]">
              Playing the {activeLang.label}
              {activeLang.nativeLabel ? ` (${activeLang.nativeLabel})` : ""} walkthrough.
              More languages can be added anytime.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <ol className="space-y-0 border border-[var(--m-line)] bg-white">
              {HOW_IT_WORKS_TUTORIAL_STEPS.map((item, index) => (
                <li
                  key={item.step}
                  className={cn(
                    "grid gap-2 px-5 py-5 sm:grid-cols-[3.5rem_1fr] sm:gap-4 sm:px-6",
                    index > 0 ? "border-t border-[var(--m-line)]" : null
                  )}
                >
                  <p className="font-display text-2xl font-semibold text-[var(--m-accent)]">
                    {item.step}
                  </p>
                  <div>
                    <h3 className="font-display text-xl font-medium text-[var(--m-ink)]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--m-muted)]">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-[var(--m-muted)]">
                Prefer watching? Open the walkthrough in your language — English or Urdu — then
                come back to this checklist while you set up.
              </p>
              <div className="flex flex-wrap gap-2">
                {HOW_IT_WORKS_LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => {
                      setLangId(lang.id);
                      setMainTab("walkthrough");
                    }}
                    className="inline-flex h-10 items-center border border-[var(--m-line)] bg-white px-4 text-sm font-medium text-[var(--m-ink)] transition-colors hover:border-[var(--m-ink)]/40"
                  >
                    Watch {lang.label}
                    {lang.nativeLabel ? ` · ${lang.nativeLabel}` : ""}
                  </button>
                ))}
              </div>
              <div className="relative overflow-hidden">
                <HowItWorksVideo
                  source={activeLang}
                  sourceKey={`tutorial-preview-${activeLang.id}`}
                  className="shadow-[0_28px_56px_-40px_rgba(6,33,29,0.55)]"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--m-muted)]">
            Same product you just learned — live on the web today.
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

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-1 text-sm font-semibold tracking-wide transition-colors sm:px-3",
        active
          ? "border-[var(--m-ink)] text-[var(--m-ink)]"
          : "border-transparent text-[var(--m-muted)] hover:text-[var(--m-ink)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
