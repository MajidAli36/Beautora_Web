import type { Metadata } from "next";
import Link from "next/link";
import { MarketingDoc } from "@/components/marketing/marketing-doc";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: `Privacy Policy for ${SYNCOPS.name} (${SYNCOPS.domain}) — how we handle account, salon, and billing data.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingDoc
      eyebrow="Legal"
      title="Privacy Policy"
      lead={`This policy explains how ${SYNCOPS.name} (${SYNCOPS.domain}), a product of ${SYNCOPS.builder.name}, handles information when you use our salon software.`}
    >
      <section>
        <h2>Who we are</h2>
        <p>
          Beautora is operated in connection with SyncOps. Contact:{" "}
          <a href={`mailto:${SYNCOPS.email}`}>{SYNCOPS.email}</a>.
        </p>
      </section>
      <section>
        <h2>Information we process</h2>
        <p>Depending on how you use Beautora, we may process:</p>
        <ul>
          <li>Account details (name, email, password authentication)</li>
          <li>Salon profile and public store listing content you choose to publish</li>
          <li>Operational data you enter (customers, appointments, sales, staff)</li>
          <li>Billing and payment review materials you submit (for example USDT transfer proofs)</li>
          <li>Technical logs needed to keep the service secure and reliable</li>
        </ul>
      </section>
      <section>
        <h2>How we use information</h2>
        <p>
          We use this information to provide the Beautora product, authenticate users, support
          billing, improve reliability, and communicate about your account. We do not sell your
          customer lists as a product.
        </p>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>
          We use infrastructure providers (for example hosting, database, email delivery, and file
          storage) strictly to run Beautora. Platform administrators may review subscription payment
          materials you submit. Public store pages only show information you enable for listing.
        </p>
      </section>
      <section>
        <h2>Retention &amp; security</h2>
        <p>
          We retain account and operational data while your store is active and as needed for legal
          or billing records. We apply industry-standard controls appropriate to a multi-tenant SaaS
          product.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <p>
          You can update salon profile settings in-app, request account help via{" "}
          <Link href="/contact">Contact</Link>, or email{" "}
          <a href={`mailto:${SYNCOPS.email}`}>{SYNCOPS.email}</a>.
        </p>
      </section>
      <section>
        <h2>Updates</h2>
        <p>
          We may update this policy as Beautora evolves. The latest version will always be published
          on this page.
        </p>
      </section>
    </MarketingDoc>
  );
}
