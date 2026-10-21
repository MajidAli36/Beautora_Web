"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  salonPublishCustomerApp,
  salonSaveCustomerAppDraft,
} from "@/lib/actions/customer-apps-salon";
import type { CustomerAppRow, CustomerAppSettings } from "@/lib/customer-apps/types";
import { toast } from "sonner";

export function SalonCustomerAppPanel({
  app,
  initialDraft,
  checklist,
}: {
  app: CustomerAppRow | null;
  initialDraft: CustomerAppSettings | null;
  checklist: { key: string; label: string; ok: boolean }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState(initialDraft);

  if (!app || !draft) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center space-y-2">
        <h2 className="text-lg font-semibold">Customer app not enabled</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Ask Beautora Super Admin to enable your branded customer app under Platform →
          Customer apps. After that, you can edit branding and publish from here.
        </p>
      </div>
    );
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <strong className="capitalize text-foreground">
              {app.status.replace(/_/g, " ")}
            </strong>{" "}
            · Slug <code>{app.slug}</code>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              run(() => salonSaveCustomerAppDraft(draft), "Draft saved")
            }
          >
            Save draft
          </Button>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => salonPublishCustomerApp(), "Published")}
          >
            Publish
          </Button>
          <Button variant="ghost" render={<Link href={`/a/${app.slug}`} target="_blank" />}>
            Preview web
          </Button>
        </div>
      </div>

      <ul className="grid gap-1 sm:grid-cols-2 rounded-lg border p-4">
        {checklist.map((c) => (
          <li key={c.key} className="text-sm">
            <span className={c.ok ? "text-emerald-600" : "text-amber-600"}>
              {c.ok ? "✓" : "○"}
            </span>{" "}
            {c.label}
          </li>
        ))}
      </ul>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-semibold">Branding</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">App name</label>
            <Input
              className="mt-1"
              value={draft.branding.appName}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, appName: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Salon display name</label>
            <Input
              className="mt-1"
              value={draft.branding.salonDisplayName}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, salonDisplayName: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">WhatsApp</label>
            <Input
              className="mt-1"
              value={draft.branding.whatsappNumber}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, whatsappNumber: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Support phone</label>
            <Input
              className="mt-1"
              value={draft.branding.supportPhone}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, supportPhone: e.target.value },
                })
              }
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Short description</label>
          <Textarea
            className="mt-1"
            value={draft.branding.shortDescription}
            onChange={(e) =>
              setDraft({
                ...draft,
                branding: { ...draft.branding, shortDescription: e.target.value },
              })
            }
          />
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Mobile app reads{" "}
        <code>/api/customer/v1/app-config?app={app.slug}</code> — only published settings.
      </p>
    </div>
  );
}
