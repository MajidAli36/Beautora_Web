import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDoc } from "@/components/marketing/marketing-doc";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Contact",
  description: `Contact ${SYNCOPS.name} support — email ${SYNCOPS.email} or call ${SYNCOPS.phoneDisplay}. Beautora is a ${SYNCOPS.builder.name} product.`,
  path: "/contact",
  keywords: ["Beautora contact", "Beautora support", "SyncOps contact"],
});

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SYNCOPS.name}`,
    url: `${SYNCOPS.url}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: SYNCOPS.name,
      url: SYNCOPS.url,
      email: SYNCOPS.email,
      telephone: SYNCOPS.phone,
      parentOrganization: {
        "@type": "Organization",
        name: SYNCOPS.builder.name,
        url: SYNCOPS.builder.url,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingDoc
        eyebrow="Support"
        title="Contact Beautora"
        lead="Questions about opening a store, billing, or partners? Reach the Beautora team directly."
      >
        <section>
          <h2>Email</h2>
          <p>
            <a href={`mailto:${SYNCOPS.email}`}>{SYNCOPS.email}</a>
          </p>
        </section>
        <section>
          <h2>Phone</h2>
          <p>
            <a href={`tel:${SYNCOPS.phone.replace(/\s/g, "")}`}>{SYNCOPS.phoneDisplay}</a>
          </p>
        </section>
        <section>
          <h2>Studio</h2>
          <p>
            Beautora is built by{" "}
            <a href={SYNCOPS.builder.url} target="_blank" rel="noopener noreferrer me author">
              {SYNCOPS.builder.name}
            </a>
            . Company page: <Link href="/syncops">About SyncOps</Link>.
          </p>
        </section>
        <section>
          <h2>Open a store</h2>
          <p>
            Ready to start? <Link href="/signup">Create your Beautora account</Link> —{" "}
            {SYNCOPS.name} includes a free trial for new stores.
          </p>
        </section>
      </MarketingDoc>
    </>
  );
}
