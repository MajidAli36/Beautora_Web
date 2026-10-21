"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  platformDeactivateCustomerApp,
  platformEnableCustomerApp,
  platformPublishCustomerApp,
  platformSuspendCustomerApp,
} from "@/lib/actions/customer-apps-platform";
import type { CustomerAppListItem } from "@/lib/customer-apps/types";
import { toast } from "sonner";

export function PlatformCustomerAppsPanel({
  apps,
  orgsWithoutApp,
}: {
  apps: CustomerAppListItem[];
  orgsWithoutApp: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [orgId, setOrgId] = useState(orgsWithoutApp[0]?.id ?? "");

  const filtered = apps.filter((a) => {
    const hay = `${a.display_name} ${a.organizationName} ${a.slug} ${a.status}`.toLowerCase();
    return !q.trim() || hay.includes(q.trim().toLowerCase());
  });

  function run(fn: () => Promise<{ error?: string; success?: boolean }>, okMsg: string) {
    start(async () => {
      const res = await fn();
      if (res.error) toast.error(res.error);
      else {
        toast.success(okMsg);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-lg font-semibold">Enable customer app</h2>
        <p className="text-sm text-muted-foreground">
          Super Admin enables a salon&apos;s branded customer app. Starts in{" "}
          <strong>setup required</strong> (draft) — not live until published.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs text-muted-foreground">Salon</label>
            <select
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              disabled={!orgsWithoutApp.length || pending}
            >
              {orgsWithoutApp.length === 0 ? (
                <option value="">All salons already have an app</option>
              ) : (
                orgsWithoutApp.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.slug})
                  </option>
                ))
              )}
            </select>
          </div>
          <Button
            disabled={!orgId || pending}
            onClick={() =>
              run(() => platformEnableCustomerApp(orgId), "Customer app enabled (draft)")
            }
          >
            Enable app
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Customer apps</h2>
            <p className="text-sm text-muted-foreground">{apps.length} total</p>
          </div>
          <Input
            className="max-w-xs"
            placeholder="Search name, salon, slug…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No customer apps yet. Enable one for a salon above.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">App</th>
                  <th className="px-3 py-2 font-medium">Salon</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Salons</th>
                  <th className="px-3 py-2 font-medium">Features</th>
                  <th className="px-3 py-2 font-medium">Updated</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{a.display_name || a.slug}</div>
                      <div className="text-xs text-muted-foreground">{a.slug}</div>
                    </td>
                    <td className="px-3 py-2">{a.organizationName}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{a.salonCount}</td>
                    <td className="px-3 py-2 tabular-nums">{a.featureEnabledCount}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(a.updated_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" render={<Link href={`/platform/customer-apps/${a.id}`} />}>
                          Open
                        </Button>
                        {a.status !== "published" ? (
                          <Button
                            size="sm"
                            disabled={pending}
                            onClick={() =>
                              run(() => platformPublishCustomerApp(a.id), "Published")
                            }
                          >
                            Publish
                          </Button>
                        ) : null}
                        {a.status === "published" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pending}
                            onClick={() =>
                              run(() => platformSuspendCustomerApp(a.id), "Suspended")
                            }
                          >
                            Suspend
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          onClick={() =>
                            run(() => platformDeactivateCustomerApp(a.id), "Deactivated")
                          }
                        >
                          Deactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
