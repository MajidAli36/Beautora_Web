import type { Metadata } from "next";
import { AppsComingSoonSection } from "@/components/marketing/apps-coming-soon-section";
import { buildPageMetadata } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const metadata: Metadata = buildPageMetadata({
  title: "Mobile & Desktop apps",
  description: `${SYNCOPS.name} by ${SYNCOPS.builder.name} — native mobile and desktop apps are coming soon. Run your salon on the web today.`,
  path: "/apps",
  keywords: ["Beautora app", "SyncOps salon app", "salon POS mobile"],
});

export default function AppsPage() {
  return <AppsComingSoonSection variant="page" />;
}
