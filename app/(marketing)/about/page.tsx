import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDoc } from "@/components/marketing/marketing-doc";
import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: `About ${SYNCOPS.name}`,
  description: `${SYNCOPS.name} is the salon operating system from ${SYNCOPS.builder.name} — online booking, POS, staff, queue, WhatsApp, and reports for modern beauty businesses.`,
  path: "/about",
  keywords: ["About Beautora", "Beautora SyncOps", "salon operating system"],
});

const PRICE = `${SUBSCRIPTION.currencyLabel} ${SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}`;

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        name: `About ${SYNCOPS.name}`,
        url: `${SYNCOPS.url}/about`,
        description: SYNCOPS.seoDescription,
        mainEntity: {
          "@type": "SoftwareApplication",
          name: SYNCOPS.name,
          url: SYNCOPS.url,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          creator: {
            "@type": "Organization",
            name: SYNCOPS.builder.name,
            url: SYNCOPS.builder.url,
          },
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Beautora?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Beautora is a salon operating system for bookings, POS, staff, queue, WhatsApp, and reports — a product of SyncOps (${SYNCOPS.builder.domain}).`,
            },
          },
          {
            "@type": "Question",
            name: "Who builds Beautora?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `Beautora is built by SyncOps, founded by ${SYNCOPS.ceo.name}. Official studio: ${SYNCOPS.builder.url}.`,
            },
          },
          {
            "@type": "Question",
            name: "How much does Beautora cost?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `First month free, then ${PRICE}/month via JazzCash per store.`,
            },
          },
          {
            "@type": "Question",
            name: "Where do I start?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Open a store at beautora.app/signup, explore live salons, or contact Beautora support.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingDoc
        eyebrow="Company"
        title={`About ${SYNCOPS.name}`}
        lead={`${SYNCOPS.name} is the operating system for modern salons — built by ${SYNCOPS.builder.name} so owners can run bookings, checkout, staff, and reports from one place.`}
      >
        <section>
          <h2>What is Beautora?</h2>
          <p>
            Beautora is salon management software for beauty businesses. It brings online booking,
            point of sale, staff attendance, queue management, WhatsApp updates, and operational
            reports into a single web platform — so the floor, front desk, and back office stay
            connected.
          </p>
        </section>

        <section>
          <h2>What problem does Beautora solve?</h2>
          <p>
            Many salons juggle WhatsApp chats, paper walk-ins, a separate POS, and spreadsheets for
            reports. Beautora replaces that patchwork with one system designed for busy salon days —
            from the first appointment to end-of-day sales.
          </p>
        </section>

        <section>
          <h2>What can you run on Beautora?</h2>
          <ul>
            <li>Online booking with public store pages</li>
            <li>POS and sales history</li>
            <li>Staff schedules, attendance, and attribution</li>
            <li>Queue and chair management for walk-ins</li>
            <li>Customer profiles and WhatsApp follow-ups</li>
            <li>Inventory and operational reports</li>
          </ul>
        </section>

        <section>
          <h2>Pricing, simply</h2>
          <p>
            Start with {SUBSCRIPTION.trialDays} days free, then {PRICE} per store per month via
            JazzCash. See current pricing on the{" "}
            <Link href="/#pricing">homepage pricing section</Link>.
          </p>
        </section>

        <section>
          <h2>Who builds Beautora?</h2>
          <p>
            Beautora is a product of{" "}
            <a href={SYNCOPS.builder.url} target="_blank" rel="noopener noreferrer me author">
              {SYNCOPS.builder.name}
            </a>
            , a software studio focused on products operators can trust on the floor. Learn more on
            our{" "}
            <Link href="/syncops">{SYNCOPS.builder.name} page</Link> or read the{" "}
            <Link href="/ceo">message from the CEO</Link>.
          </p>
        </section>

        <section>
          <h2>Frequently asked questions</h2>
          <h3>What is Beautora?</h3>
          <p>
            Beautora is a salon operating system for bookings, POS, staff, queue, WhatsApp, and
            reports — a product of SyncOps ({SYNCOPS.builder.domain}).
          </p>
          <h3>Who builds Beautora?</h3>
          <p>
            Beautora is built by SyncOps, founded by {SYNCOPS.ceo.name}. Official studio:{" "}
            <a href={SYNCOPS.builder.url} target="_blank" rel="noopener noreferrer">
              {SYNCOPS.builder.url}
            </a>
            .
          </p>
          <h3>How much does Beautora cost?</h3>
          <p>
            First month free, then {PRICE}/month via JazzCash per store.
          </p>
          <h3>Where do I start?</h3>
          <p>
            <Link href="/signup">Open a store</Link>, explore{" "}
            <Link href="/stores">live salons</Link>, or{" "}
            <Link href="/contact">contact us</Link>.
          </p>
        </section>
      </MarketingDoc>
    </>
  );
}
