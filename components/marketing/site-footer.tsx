import Link from "next/link";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--m-ink)] text-[var(--m-accent-soft)]">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-3xl font-semibold text-white">{SYNCOPS.name}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-accent-soft)]">
            {SYNCOPS.builder.label}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
            Salon POS, online booking, attendance, and operations — one month free, then{" "}
            {SUBSCRIPTION.currencyLabel} {SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}
            /month per store.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Explore</p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>
              <Link href="/stores" className="hover:text-white">
                Stores
              </Link>
            </li>
            <li>
              <Link href="/#platform" className="hover:text-white">
                Platform
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-white">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-white">
                Open a store
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Login
              </Link>
            </li>
            <li>
              <Link href="/syncops" className="hover:text-white">
                SyncOps
              </Link>
            </li>
            <li>
              <Link href="/ceo" className="hover:text-white">
                CEO
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Contact</p>
          <ul className="mt-4 space-y-3 text-sm text-white/70">
            <li>
              <a href={`tel:${SYNCOPS.phone.replace(/\s/g, "")}`} className="hover:text-white">
                {SYNCOPS.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${SYNCOPS.email}`} className="hover:text-white">
                {SYNCOPS.email}
              </a>
            </li>
            <li>
              <a
                href={SYNCOPS.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                {SYNCOPS.domain}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-white/40 sm:flex-row">
          <p>
            © {year} {SYNCOPS.name} · {SYNCOPS.builder.short}
          </p>
          <div className="flex gap-6">
            <Link href="/stores" className="hover:text-white/70">
              Store directory
            </Link>
            <Link href="/signup" className="hover:text-white/70">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
