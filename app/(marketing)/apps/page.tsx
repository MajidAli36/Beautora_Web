import type { Metadata } from "next";
import { AppsComingSoonSection } from "@/components/marketing/apps-coming-soon-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Mobile & Desktop apps",
  description: `${SYNCOPS.name} by ${SYNCOPS.builder.name} — native mobile and desktop apps are coming soon. Run your salon on the web today with the same login.`,
  path: "/apps",
  keywords: ["Beautora app", "SyncOps salon app", "salon POS mobile", "salon desktop app"],
});

export default function AppsPage() {
  return (
    <div className="bg-[var(--m-paper)] m-under-chrome">
      <div className="mx-auto max-w-6xl px-6 pt-8">
        <Breadcrumbs
          items={[
            { name: "Home", path: "/" },
            { name: "Apps", path: "/apps" },
          ]}
        />
      </div>
      <AppsComingSoonSection variant="page" />
    </div>
  );
}
