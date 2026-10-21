import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAppConfigBundle,
  getCustomerAppBySlug,
} from "@/lib/customer-apps/service";
import { blocksCustomerApi } from "@/lib/customer-apps/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CustomerAppWebPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const app = await getCustomerAppBySlug(slug);
  if (!app) notFound();

  const config = await getAppConfigBundle(app.id);
  const useDraft = sp.draft === "1" || blocksCustomerApi(app.status);
  const settings = useDraft ? config.draft : config.published ?? config.draft;
  const liveBlocked = blocksCustomerApi(app.status);

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organizations")
    .select("slug")
    .eq("id", app.organization_id)
    .maybeSingle();

  const primary = settings.branding.primaryColor || "#0F766E";
  const accent = settings.branding.accentColor || "#F59E0B";
  const wa = settings.branding.whatsappNumber.replace(/[^\d]/g, "");

  return (
    <div
      className="min-h-svh"
      style={{
        background: `linear-gradient(165deg, ${primary}14 0%, #fff 42%, ${accent}10 100%)`,
      }}
    >
      <div className="mx-auto max-w-lg px-4 py-10 space-y-8">
        {liveBlocked ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            App status is <strong>{app.status}</strong> — customer API is blocked for mobile.
            Showing draft web preview.
          </p>
        ) : null}

        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: primary }}>
            {settings.branding.brandName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight" style={{ color: primary }}>
            {settings.branding.appName}
          </h1>
          <p className="text-muted-foreground">{settings.branding.shortDescription}</p>
          <p className="text-sm">{settings.experience.welcomeMessage}</p>
        </header>

        <section className="space-y-3 rounded-2xl border bg-white/80 p-5 shadow-sm">
          <h2 className="font-semibold">{settings.experience.homepageHeadline}</h2>
          <p className="text-sm text-muted-foreground">
            {settings.experience.homepageDescription}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {org?.slug ? (
              <Link
                href={`/book/${org.slug}`}
                className="inline-flex rounded-md px-4 py-2 text-sm font-medium text-white"
                style={{ background: primary }}
              >
                Book appointment
              </Link>
            ) : null}
            <a
              href={`/api/customer/v1/app-config?app=${encodeURIComponent(app.slug)}`}
              className="inline-flex rounded-md border px-4 py-2 text-sm font-medium"
            >
              API config
            </a>
            {wa ? (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-md border px-4 py-2 text-sm font-medium"
                style={{ borderColor: accent, color: accent }}
              >
                WhatsApp
              </a>
            ) : null}
          </div>
        </section>

        <section className="text-xs text-muted-foreground space-y-1">
          <p>
            Mobile uses slug <code>{app.slug}</code> against{" "}
            <code>/api/customer/v1/*</code>
          </p>
        </section>
      </div>
    </div>
  );
}
