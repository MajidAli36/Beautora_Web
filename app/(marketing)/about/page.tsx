import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDoc } from "@/components/marketing/marketing-doc";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: `About ${SYNCOPS.name}`,
  description: `${SYNCOPS.name} is Salon Management, POS & Marketplace from ${SYNCOPS.builder.name} — online booking, salon POS, staff, queue, WhatsApp, reports, and a product Marketplace for beauty businesses worldwide.`,
  path: "/about",
  keywords: [
    "About Beautora",
    "Beautora SyncOps",
    "salon management POS marketplace",
    "salon POS software",
  ],
});

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
              text: `Beautora is Salon Management, POS & Marketplace for bookings, salon checkout, staff, queue, WhatsApp, reports, and online product sales — a product of SyncOps (${SYNCOPS.builder.domain}).`,
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
              text: "Beautora starts with a free trial, then regional USDT plans per store. See current rates on the Pricing page at beautora.app/pricing.",
            },
          },
          {
            "@type": "Question",
            name: "Where do I start?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Open a store at www.beautora.app/signup, explore live salons, or contact Beautora support.",
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
        lead={`${SYNCOPS.name} is Salon Management, POS & Marketplace — built by ${SYNCOPS.builder.name} so owners can run bookings, checkout, staff, reports, and online product sales from one workspace.`}
        breadcrumbs={[
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]}
      >
        <section>
          <h2>What is Beautora?</h2>
          <p>
            Beautora is AI-powered Salon Management, POS & Marketplace software for beauty
            businesses. Salon Management covers online booking, point of sale, staff attendance,
            queue, WhatsApp updates, and operational reports. Marketplace lets you sell products
            online with COD checkout — separate from salon POS stock and finances.
          </p>
        </section>

        <section>
          <h2>What problem does Beautora solve?</h2>
          <p>
            Many salons juggle WhatsApp chats, paper walk-ins, a separate POS, a random online shop,
            and spreadsheets for reports. Beautora replaces that patchwork with Salon Management for
            the floor and Marketplace for online retail — from the first appointment to end-of-day
            sales and COD orders.
          </p>
        </section>

        <section>
          <h2>What can you run on Beautora?</h2>
          <ul>
            <li>Online booking with public store pages</li>
            <li>Salon POS and sales history</li>
            <li>Staff schedules, attendance, and attribution</li>
            <li>Queue and chair management for walk-ins</li>
            <li>Customer profiles and WhatsApp follow-ups</li>
            <li>Inventory and operational reports</li>
            <li>Marketplace product listings, COD orders, and shop stock</li>
          </ul>
        </section>

        <section>
          <h2>Pricing</h2>
          <p>
            Beautora starts with a free trial, then regional USDT plans per store. Current rates
            and payment details live in one place — the{" "}
            <Link href="/pricing">Pricing</Link> page.
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
            Beautora is Salon Management, POS & Marketplace for bookings, salon checkout, staff,
            queue, WhatsApp, reports, and online product sales — a product of SyncOps ({
              SYNCOPS.builder.domain
            }).
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
            Beautora starts with a free trial, then regional USDT plans per store. See{" "}
            <Link href="/pricing">Pricing</Link> for current rates.
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
