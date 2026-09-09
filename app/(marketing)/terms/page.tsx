import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDoc } from "@/components/marketing/marketing-doc";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Terms of Service",
  description: `Terms of Service for ${SYNCOPS.name} salon management software by ${SYNCOPS.builder.name}.`,
  path: "/terms",
});

const PRICE = `${SUBSCRIPTION.currencyLabel} ${SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}`;

export default function TermsPage() {
  return (
    <MarketingDoc
      eyebrow="Legal"
      title="Terms of Service"
      lead={`These terms govern use of ${SYNCOPS.name} at ${SYNCOPS.domain}, a product of ${SYNCOPS.builder.name}.`}
    >
      <section>
        <h2>The service</h2>
        <p>
          Beautora provides salon management tools including booking, POS, staff, queue, messaging
          helpers, and reports. Features may evolve; we aim to keep core salon operations reliable.
        </p>
      </section>
      <section>
        <h2>Accounts</h2>
        <p>
          You must provide accurate account information and keep credentials secure. You are
          responsible for activity under your store account and for staff logins you create.
        </p>
      </section>
      <section>
        <h2>Subscriptions &amp; billing</h2>
        <p>
          New stores may receive a {SUBSCRIPTION.trialDays}-day trial. Ongoing use is billed per
          store at the published rate (currently {PRICE}/month) according to the payment process
          shown in Billing. Platform review of payment proofs may be required before a period is
          activated.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>
          Do not misuse Beautora, attempt unauthorized access, or use the platform for unlawful
          activity. Public store pages must not display misleading or illegal content.
        </p>
      </section>
      <section>
        <h2>Your data</h2>
        <p>
          You retain ownership of salon operational data you enter. Our{" "}
          <Link href="/privacy">Privacy Policy</Link> explains how we handle information.
        </p>
      </section>
      <section>
        <h2>Disclaimer</h2>
        <p>
          Beautora is provided as a business software service. We work to keep it available and
          accurate, but we do not guarantee uninterrupted operation or outcomes of your salon
          business decisions.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions: <Link href="/contact">Contact Beautora</Link> or{" "}
          <a href={`mailto:${SYNCOPS.email}`}>{SYNCOPS.email}</a>.
        </p>
      </section>
    </MarketingDoc>
  );
}
