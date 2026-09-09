import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CEO_PAGE } from "@/lib/marketing/ceo-page";
import { SYNCOPS } from "@/lib/print/syncops";

/** Landing section — CEO portrait + message as the team behind Beautora. */
export function TeamBehindSection() {
  const { ceo } = CEO_PAGE;

  return (
    <section
      id="team"
      className="scroll-mt-28 border-y border-[var(--m-line)] bg-[var(--m-ink)] py-28 text-white sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-16">
        <div className="relative mx-auto w-full max-w-md lg:mx-0">
          <div
            aria-hidden
            className="absolute -inset-3 bg-[radial-gradient(circle_at_30%_20%,rgba(197,212,206,0.22),transparent_55%)]"
          />
          <div className="relative overflow-hidden border border-white/15 bg-white/5 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.85)]">
            <Image
              src={ceo.photo}
              alt={ceo.portraitAlt}
              width={720}
              height={900}
              className="aspect-[4/5] w-full object-cover object-top"
            />
          </div>
          <p className="mt-4 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45 lg:text-left">
            {SYNCOPS.builder.name} · {SYNCOPS.name}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
            Team behind Beautora
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {ceo.headline}
          </h2>
          <p className="mt-4 text-sm font-medium text-white/55">
            {ceo.name} · {ceo.role}
          </p>

          <blockquote className="mt-8 border-l border-white/20 pl-5 font-display text-lg italic leading-relaxed text-white/80 sm:text-xl">
            “{ceo.message}”
          </blockquote>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/55">
            {ceo.focus}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/ceo"
              className="inline-flex h-12 items-center gap-2 bg-[var(--m-paper)] px-7 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors hover:bg-white"
            >
              Message from the CEO
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/syncops"
              className="inline-flex h-12 items-center border border-white/25 px-7 text-sm font-medium tracking-wide text-white/85 transition-colors hover:border-white/50 hover:text-white"
            >
              Meet SyncOps
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
