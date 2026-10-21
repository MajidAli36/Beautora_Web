import Link from "next/link";
import { BeautoraLogo } from "@/components/brand/beautora-logo";
import { SYNCOPS } from "@/lib/print/syncops";

export function LandingFinalCta() {
  return (
    <section className="m-section bg-[var(--m-ink)] text-white">
      <div className="m-container text-center">
        <div className="mb-4 flex justify-center">
          <BeautoraLogo size="md" />
        </div>
        <h2 className="font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight">
          Ready to run your salon on {SYNCOPS.name}?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/70">
          Start with the full platform on a free trial. Plans and regional USDT rates live on
          Pricing — one place, no surprises.
        </p>
        <div className="mt-6 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <Link href="/signup" className="m-btn m-btn-light">
            Start free
          </Link>
          <Link href="/pricing" className="m-btn m-btn-ghost">
            View pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
