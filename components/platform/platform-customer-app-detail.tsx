"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  platformPublishCustomerApp,
  platformSaveCustomerAppDraft,
  platformSuspendCustomerApp,
} from "@/lib/actions/customer-apps-platform";
import type { CustomerAppRow, CustomerAppSettings } from "@/lib/customer-apps/types";
import { toast } from "sonner";

export function PlatformCustomerAppDetail({
  app,
  orgName,
  initialDraft,
  checklist,
  publishedAt,
}: {
  app: CustomerAppRow;
  orgName: string;
  initialDraft: CustomerAppSettings;
  checklist: { key: string; label: string; ok: boolean }[];
  publishedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(initialDraft);

  function patchBranding<K extends keyof CustomerAppSettings["branding"]>(
    key: K,
    value: CustomerAppSettings["branding"][K]
  ) {
    setDraft((d) => ({ ...d, branding: { ...d.branding, [key]: value } }));
  }

  function run(fn: () => Promise<{ error?: string }>, ok: string) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            run(() => platformSaveCustomerAppDraft(app.id, draft), "Draft saved")
          }
        >
          Save draft
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => platformPublishCustomerApp(app.id), "Published")}
        >
          Publish live
        </Button>
        {app.status === "published" ? (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => platformSuspendCustomerApp(app.id), "Suspended")}
          >
            Suspend API
          </Button>
        ) : null}
        <Button variant="ghost" render={<Link href={`/a/${app.slug}`} target="_blank" />}>
          Web preview
        </Button>
        <Button
          variant="ghost"
          render={
            <Link
              href={`/api/customer/v1/app-config?app=${encodeURIComponent(app.slug)}`}
              target="_blank"
            />
          }
        >
          API config
        </Button>
      </div>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-semibold">Overview</h2>
        <p className="text-sm text-muted-foreground">
          Salon: <strong>{orgName}</strong> · Slug: <code>{app.slug}</code> · Status:{" "}
          <strong className="capitalize">{app.status.replace(/_/g, " ")}</strong>
          {publishedAt ? ` · Published ${new Date(publishedAt).toLocaleString()}` : ""}
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.key} className="text-sm">
              <span className={c.ok ? "text-emerald-600" : "text-amber-600"}>
                {c.ok ? "✓" : "○"}
              </span>{" "}
              {c.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">App settings (draft)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["appName", "App name"],
              ["brandName", "Brand name"],
              ["salonDisplayName", "Salon display name"],
              ["supportPhone", "Support phone"],
              ["whatsappNumber", "WhatsApp"],
              ["supportEmail", "Support email"],
              ["primaryColor", "Primary color"],
              ["accentColor", "Accent color"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input
                className="mt-1"
                value={draft.branding[key] ?? ""}
                onChange={(e) => patchBranding(key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Short description</label>
          <Textarea
            className="mt-1"
            value={draft.branding.shortDescription}
            onChange={(e) => patchBranding("shortDescription", e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Welcome message</label>
          <Input
            className="mt-1"
            value={draft.experience.welcomeMessage}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                experience: { ...d.experience, welcomeMessage: e.target.value },
              }))
            }
          />
        </div>
      </section>
    </div>
  );
}
