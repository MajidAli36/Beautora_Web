import Link from "next/link";
import { OnlineBookingForm } from "@/components/features/booking/online-booking-form";
import {
  formatHoursLine,
  PAYMENT_ACCOUNT_TYPE_LABELS,
  type BusinessHoursDay,
  type PaymentAccount,
} from "@/lib/store/profile";
import { SYNCOPS } from "@/lib/print/syncops";

export type BookingOrg = {
  slug: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  arrival_notes: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  business_hours: BusinessHoursDay[];
  paymentAccounts: PaymentAccount[];
  services: { id: string; name: string; price: number; duration_minutes: number }[];
  staff: { id: string; full_name: string; job_title: string | null }[];
  booking_days_ahead?: number | null;
  booking_advance_amount?: number | null;
  booking_advance_percent?: number | null;
  booking_payment_instructions?: string | null;
};

function arrivalLines(notes: string | null): string[] {
  if (!notes?.trim()) {
    return [
      "Arrive five minutes early",
      "Bring inspiration photos if you have them",
      "Please call 24 hours ahead to cancel",
    ];
  }
  return notes
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function MarketingBookingPage({ org }: { org: BookingOrg | null }) {
  const phone = org?.phone || org?.whatsapp_phone || null;
  const phoneHref = phone?.replace(/\s/g, "") ?? null;

  return (
    <div className="bg-[var(--m-paper)] pt-[calc(var(--m-chrome)+1rem)] sm:pt-[calc(var(--m-chrome)+1.5rem)]">
      <div className="mx-auto max-w-6xl px-6 py-14 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
            Online booking
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
            Book your appointment
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
            Choose services, stylist, and time — your chair is held the moment you confirm.
          </p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-5 lg:items-start">
          <aside className="space-y-8 lg:col-span-2">
            {org?.coverUrl && (
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--m-mist)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={org.coverUrl}
                  alt={`${org.name} salon`}
                  className="size-full object-cover"
                />
              </div>
            )}

            <div className="border-t border-[var(--m-line)] pt-6">
              <div className="flex items-start gap-4">
                {org?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={org.logoUrl}
                    alt=""
                    className="size-14 shrink-0 object-cover ring-1 ring-[var(--m-line)]"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="font-display text-2xl font-medium text-[var(--m-ink)]">
                    {org?.name ?? "Salon"}
                  </p>
                  {org?.tagline && (
                    <p className="mt-1 text-sm text-[var(--m-muted)]">{org.tagline}</p>
                  )}
                </div>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                {org?.address && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
                      Address
                    </dt>
                    <dd className="mt-1 text-[var(--m-ink)]">{org.address}</dd>
                  </div>
                )}
                {phone && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
                      Phone
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={phoneHref ? `tel:${phoneHref}` : undefined}
                        className="text-[var(--m-ink)] underline-offset-4 hover:underline"
                      >
                        {phone}
                      </a>
                    </dd>
                  </div>
                )}
                {org?.email && (
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
                      Email
                    </dt>
                    <dd className="mt-1">
                      <a
                        href={`mailto:${org.email}`}
                        className="text-[var(--m-ink)] underline-offset-4 hover:underline"
                      >
                        {org.email}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--m-muted)]">
                    Hours
                  </dt>
                  <dd className="mt-1 space-y-1 text-[var(--m-ink)]">
                    {(org?.business_hours ?? []).map((h) => (
                      <div key={h.day} className="flex justify-between gap-4">
                        <span className="text-[var(--m-muted)]">{h.label}</span>
                        <span>{formatHoursLine(h)}</span>
                      </div>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>

            {(org?.paymentAccounts?.length ?? 0) > 0 && (
              <div className="border-t border-[var(--m-line)] pt-6 text-sm">
                <p className="font-medium text-[var(--m-ink)]">Pay advance to</p>
                <ul className="mt-3 space-y-3">
                  {org!.paymentAccounts.map((a) => (
                    <li key={a.id} className="border border-[var(--m-line)] bg-[var(--m-mist)]/60 p-3">
                      <p className="font-medium text-[var(--m-ink)]">
                        {a.label}{" "}
                        <span className="text-xs font-normal text-[var(--m-muted)]">
                          · {PAYMENT_ACCOUNT_TYPE_LABELS[a.account_type]}
                        </span>
                      </p>
                      {a.account_title && (
                        <p className="mt-1 text-[var(--m-muted)]">{a.account_title}</p>
                      )}
                      {a.bank_name && (
                        <p className="text-[var(--m-muted)]">{a.bank_name}</p>
                      )}
                      <p className="mt-1 font-mono text-[var(--m-ink)]">{a.account_number}</p>
                      {a.extra_note && (
                        <p className="mt-2 text-xs text-[var(--m-muted)]">{a.extra_note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-[var(--m-line)] pt-6 text-sm text-[var(--m-muted)]">
              <p className="font-medium text-[var(--m-ink)]">Before you arrive</p>
              <ul className="mt-3 space-y-2">
                {arrivalLines(org?.arrival_notes ?? null).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="mt-6 text-xs">Powered by {SYNCOPS.name}</p>
            </div>
          </aside>

          <div className="lg:col-span-3">
            {org ? (
              <OnlineBookingForm
                variant="marketing"
                orgSlug={org.slug}
                orgName={org.name}
                orgPhone={phone}
                orgAddress={org.address}
                orgWhatsApp={org.whatsapp_phone}
                services={org.services}
                staff={org.staff}
                daysAhead={org.booking_days_ahead ?? 30}
                paymentAccounts={org.paymentAccounts}
                advanceSettings={{
                  booking_advance_amount: org.booking_advance_amount,
                  booking_advance_percent: org.booking_advance_percent,
                  booking_payment_instructions: org.booking_payment_instructions,
                }}
              />
            ) : (
              <div className="border border-dashed border-[var(--m-line)] bg-[var(--m-mist)] p-10 text-center">
                <p className="font-medium text-[var(--m-ink)]">
                  Online booking is temporarily unavailable
                </p>
                <Link
                  href="/"
                  className="mt-6 inline-block text-sm font-medium text-[var(--m-accent)] hover:underline"
                >
                  ← Back to home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
