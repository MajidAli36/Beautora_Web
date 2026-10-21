import Link from "next/link";
import { BeautoraWordmark } from "@/components/brand/beautora-logo";
import { SYNCOPS } from "@/lib/print/syncops";

const PRODUCT_LINKS = [
  { href: "/salon-management-software", label: "Salon management" },
  { href: "/salon-booking-software", label: "Booking" },
  { href: "/salon-pos", label: "POS" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/signup", label: "Start free" },
] as const;

const DISCOVER_LINKS = [
  { href: "/stores", label: "Stores" },
  { href: "/shop", label: "Shop" },
  { href: "/discover", label: "Discover" },
  { href: "/videos", label: "Videos" },
  { href: "/blog", label: "Blog" },
  { href: "/tools", label: "Tools" },
  { href: "/apps", label: "Apps" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--m-ink)] text-[var(--m-accent-soft)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10">
        <div>
          <BeautoraWordmark size="lg" textClassName="text-white" />
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Salon management, POS & marketplace for modern beauty businesses.
          </p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-accent)]">
            {SYNCOPS.builder.label}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/45">
            Free trial to start. Current plans and regional USDT rates are on{" "}
            <Link href="/pricing" className="text-white/70 underline-offset-2 hover:underline">
              Pricing
            </Link>
            .
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Product</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            {PRODUCT_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-accent)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Explore</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            {DISCOVER_LINKS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-sm transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--m-accent)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Company</p>
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

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">
            Contact
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-white/70">
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
          </ul>

          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-white/45">Legal</p>
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
