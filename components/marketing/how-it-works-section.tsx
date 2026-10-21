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
    <section id="how-it-works" className="m-section scroll-mt-28 bg-[var(--m-mist)]">
      <div className="m-container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-end lg:gap-10">
          <div className="max-w-xl">
            <p className="m-eyebrow">How it works</p>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight text-[var(--m-ink)]">
              Watch Beautora go live.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">
              Pick a language walkthrough — or follow the written tutorial step by step.
            </p>
          </div>

          <ol className="grid gap-5 sm:grid-cols-3 lg:gap-4">
            {OVERVIEW_STEPS.map((item) => (
              <li key={item.step}>
                <p className="font-display text-xl font-semibold text-[var(--m-accent)]">
                  {item.step}
                </p>
                <h3 className="mt-1.5 font-display text-lg font-medium text-[var(--m-ink)]">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--m-muted)]">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div
          role="tablist"
          aria-label="How it works mode"
          className="mt-8 flex flex-wrap gap-2 border-b border-[var(--m-line)] pb-0 sm:mt-10"
        >
          <ModeTab
            id="hiw-tab-walkthrough"
            controls="hiw-panel-walkthrough"
            active={mainTab === "walkthrough"}
            onClick={() => setMainTab("walkthrough")}
            icon={<Clapperboard className="size-4" />}
            label="Walkthrough"
          />
          <ModeTab
            id="hiw-tab-tutorial"
            controls="hiw-panel-tutorial"
            active={mainTab === "tutorial"}
            onClick={() => setMainTab("tutorial")}
            icon={<BookOpen className="size-4" />}
            label="Tutorial"
          />
        </div>

        {mainTab === "walkthrough" ? (
          <div
            id="hiw-panel-walkthrough"
            role="tabpanel"
            aria-labelledby="hiw-tab-walkthrough"
            className="mt-6 space-y-5"
          >
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
                    id={`hiw-lang-${lang.id}`}
                    aria-controls="hiw-video"
                    tabIndex={active ? 0 : -1}
                    onClick={() => setLangId(lang.id)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 px-4 text-sm font-medium tracking-wide transition-colors",
                      active
                        ? "bg-[var(--m-ink)] text-[var(--m-paper)]"
                        : "border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink)] hover:border-[var(--m-ink)]/40"
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

            <div id="hiw-video" className="relative">
              <HowItWorksVideo
                source={activeLang}
                sourceKey={activeLang.id}
                className="shadow-[var(--m-shadow)]"
              />
            </div>
            <p className="text-sm text-[var(--m-muted)]">
              {activeLang.label}
              {activeLang.nativeLabel ? ` (${activeLang.nativeLabel})` : ""} walkthrough — press
              play when you are ready. More languages can be added anytime.
            </p>
          </div>
        ) : (
          <div
            id="hiw-panel-tutorial"
            role="tabpanel"
            aria-labelledby="hiw-tab-tutorial"
            className="mt-8"
          >
            <ol className="max-w-3xl space-y-0 border border-[var(--m-line)] bg-[var(--m-card)]">
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

            <div className="mt-6 flex flex-wrap gap-2">
              {HOW_IT_WORKS_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => {
                    setLangId(lang.id);
                    setMainTab("walkthrough");
                  }}
                  className="inline-flex h-10 items-center border border-[var(--m-line)] bg-[var(--m-card)] px-4 text-sm font-medium text-[var(--m-ink)] transition-colors hover:border-[var(--m-ink)]/40"
                >
                  Watch {lang.label}
                  {lang.nativeLabel ? ` · ${lang.nativeLabel}` : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--m-muted)]">
            Same product you just learned — live on the web today.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/signup" className="m-btn m-btn-primary">
              Create your store
            </Link>
            <Link href="/pricing" className="m-btn m-btn-secondary">
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeTab({
  id,
  controls,
  active,
  onClick,
  icon,
  label,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
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
