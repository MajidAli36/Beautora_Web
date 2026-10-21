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
      className="m-section scroll-mt-28 border-y border-[var(--m-line)] bg-[var(--m-ink)] text-white"
    >
      <div className="m-container grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12">
        <div className="relative mx-auto w-full max-w-sm lg:mx-0">
          <div
            aria-hidden
            className="absolute -inset-2 bg-[radial-gradient(circle_at_30%_20%,rgba(201,166,107,0.18),transparent_55%)]"
          />
          <div className="relative aspect-[4/5] overflow-hidden border border-white/15 bg-[linear-gradient(160deg,#174b3c,#073b32)] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.85)]">
            <Image
              src={ceo.photo}
              alt={ceo.portraitAlt}
              fill
              sizes="(max-width: 1024px) 100vw, 28rem"
              className="object-cover object-top"
            />
          </div>
          <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45 lg:text-left">
            {SYNCOPS.builder.name} · {SYNCOPS.name}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
            Team behind Beautora
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {ceo.headline}
          </h2>
          <p className="mt-3 text-sm font-medium text-white/55">
            {ceo.name} · {ceo.role}
          </p>

          <blockquote className="mt-5 border-l border-white/20 pl-4 font-display text-base italic leading-relaxed text-white/80 sm:text-lg">
            “{ceo.message}”
          </blockquote>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
            {ceo.focus}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <Link
              href="/ceo"
              className="m-btn m-btn-light"
            >
              Message from the CEO
              <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/syncops" className="m-btn m-btn-ghost">
              Meet SyncOps
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
