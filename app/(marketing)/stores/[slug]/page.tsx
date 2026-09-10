import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicStoreBySlug } from "@/lib/actions/stores";
import { formatCurrency, formatDuration } from "@/lib/format";
import { resolveStorePublicContact } from "@/lib/marketing/store-contact";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const dynamic = "force-dynamic";

type StoreDetailPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: StoreDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) {
    return buildPageMetadata({
      title: "Store not found",
      description: `This salon is not available on ${SYNCOPS.name}.`,
      path: `/stores/${slug}`,
      noIndex: true,
    });
  }
  const blurb =
    store.highlightServices.length > 0
      ? store.highlightServices.join(" · ")
      : `Book online at ${store.name}`;
  const ogImage = store.coverUrl ?? store.visual.coverImage;
  const base = buildPageMetadata({
    title: store.name,
    description: `${blurb}. Book on ${SYNCOPS.name} by ${SYNCOPS.builder.name}.`,
    path: `/stores/${slug}`,
  });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      images: [{ url: ogImage }],
    },
  };
}

export default async function StoreDetailPage({ params }: StoreDetailPageProps) {
  const { slug } = await params;
  const store = await getPublicStoreBySlug(slug);
  if (!store) notFound();

  // Store phone / WhatsApp only — never platform SyncOps support number.
  const contact = resolveStorePublicContact({
    phone: store.phone,
    whatsappPhone: store.whatsappPhone,
  });
  const coverSrc = store.coverUrl ?? store.visual.coverImage;
  const coverAlt = store.coverUrl ? `${store.name} cover` : store.visual.coverAlt;

  return (
    <div className="bg-[var(--m-paper)]">
      <section className="relative min-h-[58vh] overflow-hidden bg-[var(--m-ink)] text-white sm:min-h-[68vh]">
        {store.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverSrc}
            alt={coverAlt}
            className="absolute inset-0 size-full object-cover object-center"
          />
        ) : (
          <Image
            src={coverSrc}
            alt={coverAlt}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(12,31,28,0.88)_0%,rgba(12,31,28,0.5)_50%,rgba(12,31,28,0.25)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,31,28,0.7)_0%,transparent_45%)]" />

        <div className="relative mx-auto flex min-h-[58vh] max-w-6xl flex-col justify-end px-6 pb-14 pt-[calc(var(--m-chrome)+2rem)] sm:min-h-[68vh] sm:pb-20 lg:pt-[calc(var(--m-chrome)+2.5rem)]">
          <Link
            href="/stores"
            className="mb-8 w-fit text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            ← All stores
          </Link>
          <div className="flex flex-wrap items-end gap-5">
            <div
              className="flex size-16 items-center justify-center overflow-hidden text-lg font-semibold text-white ring-1 ring-white/25 sm:size-20 sm:text-xl"
              style={{
                background: `linear-gradient(135deg, ${store.visual.accentFrom}, ${store.visual.accentTo})`,
              }}
            >
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt="" className="size-full object-cover" />
              ) : (
                store.visual.logoInitials
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent-soft)]">
                {store.city?.trim() || `/${store.slug}`}
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                {store.name}
              </h1>
              <p className="mt-3 max-w-xl text-base text-white/75 sm:text-lg">
                {store.highlightServices.length > 0
                  ? store.highlightServices.join(" · ")
                  : `${store.serviceCount} service${store.serviceCount === 1 ? "" : "s"} on Beautora`}
              </p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            {store.publicBookingEnabled ? (
              <Link
                href={`/book/${store.slug}`}
                className="inline-flex h-12 items-center bg-white px-7 text-sm font-semibold tracking-wide text-[var(--m-ink)] transition-colors hover:bg-[var(--m-mist)]"
              >
                Book now
              </Link>
            ) : null}
            <Link
              href="#menu"
              className="inline-flex h-12 items-center border border-white/35 px-7 text-sm font-medium tracking-wide text-white transition-colors hover:border-white hover:bg-white/10"
            >
              View menu
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--m-line)] bg-[var(--m-mist)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 sm:grid-cols-3">
          <Stat
            label="Services"
            value={`${store.serviceCount}`}
            hint="On the live menu"
          />
          <Stat
            label="Stylists"
            value={`${store.staffCount}`}
            hint="Open for online booking"
          />
          <Stat
            label="Booking window"
            value={`${store.bookingDaysAhead} days`}
            hint={`${store.bookingSlotMinutes}-min slots`}
          />
        </div>
      </section>

      <section id="menu" className="scroll-mt-24 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Services &amp; products
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)]">
              The menu
            </h2>
            <p className="mt-4 text-lg text-[var(--m-muted)]">
              Services you can book and retail products available at this store.
            </p>
          </div>

          {store.services.length === 0 && store.products.length === 0 ? (
            <p className="mt-12 border-y border-[var(--m-line)] py-8 text-[var(--m-muted)]">
              No services or products published yet.
            </p>
          ) : (
            <div className="mt-12 space-y-14">
              {store.services.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
                    Services
                  </h3>
                  <ul className="mt-5 divide-y divide-[var(--m-line)] border-y border-[var(--m-line)]">
                    {store.services.map((service) => (
                      <li
                        key={service.id}
                        className="grid gap-2 py-7 sm:grid-cols-[1.4fr_auto_auto] sm:items-baseline sm:gap-8"
                      >
                        <h4 className="font-display text-2xl font-medium text-[var(--m-ink)]">
                          {service.name}
                        </h4>
                        <span className="text-sm text-[var(--m-muted)]">
                          {formatDuration(service.duration_minutes)}
                        </span>
                        <span className="text-sm font-semibold text-[var(--m-ink)] sm:text-right">
                          from {formatCurrency(service.price, { country: store.country })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {store.products.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--m-muted)]">
                    Products
                  </h3>
                  <ul className="mt-5 divide-y divide-[var(--m-line)] border-y border-[var(--m-line)]">
                    {store.products.map((product) => (
                      <li
                        key={product.id}
                        className="grid gap-2 py-7 sm:grid-cols-[1.4fr_auto] sm:items-baseline sm:gap-8"
                      >
                        <div className="min-w-0">
                          <h4 className="font-display text-2xl font-medium text-[var(--m-ink)]">
                            {product.name}
                          </h4>
                          {product.description?.trim() ? (
                            <p className="mt-1 text-sm text-[var(--m-muted)]">
                              {product.description.trim()}
                            </p>
                          ) : null}
                        </div>
                        <span className="text-sm font-semibold text-[var(--m-ink)] sm:text-right">
                          {formatCurrency(product.price, { country: store.country })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[var(--m-mist)] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Team
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)]">
              Stylists
            </h2>
          </div>

          {store.staff.length === 0 ? (
            <p className="mt-10 text-[var(--m-muted)]">
              Stylists will appear here when online booking is enabled.
            </p>
          ) : (
            <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {store.staff.map((member) => (
                <li key={member.id} className="border-t border-[var(--m-line)] pt-6">
                  <div
                    className="mb-4 flex size-14 items-center justify-center text-sm font-semibold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${store.visual.accentFrom}, ${store.visual.accentTo})`,
                    }}
                  >
                    {member.full_name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <h3 className="font-display text-2xl font-medium text-[var(--m-ink)]">
                    {member.full_name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--m-muted)]">
                    {member.job_title || "Stylist"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Visit
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)]">
              Reserve your chair
            </h2>
            <p className="mt-4 max-w-xl text-lg text-[var(--m-muted)]">
              {store.publicBookingEnabled
                ? `Book online at ${store.name}. Slots open for the next ${store.bookingDaysAhead} days.`
                : `Visit ${store.name} or call to reserve — online booking is currently off.`}
            </p>
            {store.publicBookingEnabled ? (
              <Link
                href={`/book/${store.slug}`}
                className="mt-8 inline-flex h-12 items-center bg-[var(--m-ink)] px-8 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
              >
                Book online
              </Link>
            ) : contact ? (
              <a
                href={`tel:${contact.telHref}`}
                className="mt-8 inline-flex h-12 items-center bg-[var(--m-ink)] px-8 text-sm font-semibold tracking-wide text-[var(--m-paper)] transition-colors hover:bg-[var(--m-ink-soft)]"
              >
                Call the salon
              </a>
            ) : null}
          </div>
          <div className="space-y-6 border-t border-[var(--m-line)] pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
                Store
              </p>
              <p className="mt-2 text-base text-[var(--m-ink)]">{store.name}</p>
              {store.city && (
                <p className="mt-1 text-sm text-[var(--m-muted)]">{store.city}</p>
              )}
              {store.address && (
                <p className="mt-1 text-sm text-[var(--m-muted)]">{store.address}</p>
              )}
              <p className="mt-1 text-sm text-[var(--m-muted)]">/{store.slug}</p>
            </div>
            {contact ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
                  Call / WhatsApp
                </p>
                <a
                  href={`tel:${contact.telHref}`}
                  className="mt-2 inline-block text-base text-[var(--m-ink)] underline-offset-4 hover:underline"
                >
                  {contact.display}
                </a>
                {contact.whatsappHref ? (
                  <p className="mt-2">
                    <a
                      href={contact.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-[var(--m-accent)] underline-offset-4 hover:underline"
                    >
                      Message on WhatsApp
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
                Platform
              </p>
              <p className="mt-2 text-base text-[var(--m-ink)]">
                Powered by {SYNCOPS.name}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--m-muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-[var(--m-ink)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--m-muted)]">{hint}</p>
    </div>
  );
}
