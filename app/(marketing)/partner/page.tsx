import Link from "next/link";
import type { Metadata } from "next";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { PartnerApplyForm } from "@/components/features/partners/partner-apply-form";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: `Partner program`,
  description: `Earn the full first ${SUBSCRIPTION.currencyLabel} ${SUBSCRIPTION.monthlyAmountPkr} subscription when you refer a salon to ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`,
  path: "/partner",
  keywords: ["Beautora partner", "SyncOps partner", "salon referral program"],
});

export default function PartnerLandingPage() {
  return (
    <div className="bg-[var(--m-paper)] text-[var(--m-ink)]">
      <section className="relative overflow-hidden border-b border-[var(--m-line)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,157,140,0.08),_transparent_55%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-28 lg:grid-cols-2 lg:items-start lg:gap-16 lg:pb-24 lg:pt-32">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--m-accent)]">
              Partner program
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Bring salons to Beautora.
              <span className="block text-[var(--m-ink-soft)]">
                Earn their first month.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--m-muted)] sm:text-lg">
              Share your personal link. When a new salon opens under your username and pays
              their first subscription (
              {SUBSCRIPTION.currencyLabel}{" "}
              {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}
              ), that full first payment is credited to you — every referred client, tracked
              in your partner dashboard.
            </p>

            <ul className="mt-8 space-y-3 text-sm text-[var(--m-ink-soft)]">
              <li className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--m-accent)]" />
                Apply with email + username — SyncOps approves before your link goes live
              </li>
              <li className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--m-accent)]" />
                First paid subscription only (not renewals) — full{" "}
                {SUBSCRIPTION.currencyLabel}{" "}
                {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")} to you
              </li>
              <li className="flex gap-3">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--m-accent)]" />
                See every referred store and earnings in one place
              </li>
            </ul>

            <p className="mt-8 text-sm text-[var(--m-muted)]">
              Already a partner?{" "}
              <Link href="/login" className="font-semibold text-[var(--m-accent)] hover:underline">
                Sign in to your dashboard
              </Link>
            </p>
          </div>

          <div className="border border-[var(--m-line)] bg-white/90 p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Become a partner
            </h2>
            <p className="mt-2 text-sm text-[var(--m-muted)]">
              Applications are reviewed carefully. You&apos;ll get dashboard access right away;
              referrals activate after approval.
            </p>
            <div className="mt-6">
              <PartnerApplyForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
