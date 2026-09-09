import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--m-ink)] text-[var(--m-accent-soft)]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-semibold text-white">{SYNCOPS.name}</p>
          <p className="mt-2 text-sm text-white/60">
            The operating system for modern salons.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-accent-soft)]">
            {SYNCOPS.builder.label}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
            {SUBSCRIPTION.trialDays} days free, then {SUBSCRIPTION.currencyLabel}{" "}
            {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month per store.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Product
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              <Link href="/#platform" className="transition-colors hover:text-white">
                Platform
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="transition-colors hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/stores" className="transition-colors hover:text-white">
                Stores
              </Link>
            </li>
            <li>
              <Link href="/apps" className="transition-colors hover:text-white">
                Apps
              </Link>
            </li>
            <li>
              <Link href="/signup" className="transition-colors hover:text-white">
                Start free
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Company
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              <Link href="/about" className="transition-colors hover:text-white">
                About Beautora
              </Link>
            </li>
            <li>
              <Link href="/contact" className="transition-colors hover:text-white">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/partner" className="transition-colors hover:text-white">
                Partner
              </Link>
            </li>
            <li>
              <Link href="/syncops" className="transition-colors hover:text-white">
                About SyncOps
              </Link>
            </li>
            <li>
              <Link href="/ceo" className="transition-colors hover:text-white">
                CEO
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Contact
          </p>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>
              <a
                href={`tel:${SYNCOPS.phone.replace(/\s/g, "")}`}
                className="transition-colors hover:text-white"
              >
                {SYNCOPS.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SYNCOPS.email}`} className="transition-colors hover:text-white">
                {SYNCOPS.email}
              </a>
            </li>
            <li>
              <a
                href={SYNCOPS.builder.url}
                target="_blank"
                rel="noopener noreferrer me author"
                className="transition-colors hover:text-white"
              >
                Built by SyncOps
              </a>
            </li>
          </ul>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Legal
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/55">
            <li>
              <Link href="/privacy" className="transition-colors hover:text-white/80">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition-colors hover:text-white/80">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-white/40 sm:flex-row">
          <p>
            © {year} {SYNCOPS.builder.name}. {SYNCOPS.name} is a {SYNCOPS.builder.name} product.
          </p>
          <p>
            <a
              href={SYNCOPS.builder.url}
              target="_blank"
              rel="noopener noreferrer me author"
              className="hover:text-white/70"
            >
              {SYNCOPS.builder.domain}
            </a>
            {" · "}
            <Link href="/about" className="hover:text-white/70">
              About Beautora
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
