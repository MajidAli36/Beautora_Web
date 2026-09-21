"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  reviewPayoutRequestAction,
  updateMarketplaceSettingsAction,
  upsertCommissionRuleAction,
} from "@/lib/marketplace/admin";
import type { MarketplaceSettings } from "@/lib/marketplace/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";

export function PlatformMarketplaceAdminClient({
  settings,
  metrics,
  payoutRequests,
}: {
  settings: MarketplaceSettings;
  metrics: {
    sellers: number;
    publishedProducts: number;
    orders: number;
    commissionOwed: number;
    commissionPaid: number;
    pendingPayoutRequests: number;
  };
  payoutRequests: Array<{
    id: string;
    amount: number;
    status: string;
    method: string;
    created_at: string;
    marketplace_sellers: { shop_name: string; slug: string } | null;
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["Sellers", metrics.sellers],
          ["Published", metrics.publishedProducts],
          ["Orders", metrics.orders],
          ["Commission owed", formatCurrency(metrics.commissionOwed)],
          ["Commission paid", formatCurrency(metrics.commissionPaid)],
          ["Payout requests", metrics.pendingPayoutRequests],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <form
        className="grid max-w-xl gap-4 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await updateMarketplaceSettingsAction(fd);
            if (res.error) notify.error(res.error);
            else {
              notify.success(res.message ?? "Saved");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="text-base font-semibold">Global settings</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="listing_fee">Listing fee</Label>
            <Input
              id="listing_fee"
              name="listing_fee"
              type="number"
              step="0.01"
              defaultValue={settings.listing_fee}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="default_commission_pct">Default commission %</Label>
            <Input
              id="default_commission_pct"
              name="default_commission_pct"
              type="number"
              step="0.01"
              defaultValue={Number(settings.default_commission_rate) * 100}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="featured_listing_price">Featured price</Label>
            <Input
              id="featured_listing_price"
              name="featured_listing_price"
              type="number"
              step="0.01"
              defaultValue={settings.featured_listing_price}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="advertising_price">Advertising price</Label>
            <Input
              id="advertising_price"
              name="advertising_price"
              type="number"
              step="0.01"
              defaultValue={settings.advertising_price}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="marketplace_enabled"
            value="1"
            defaultChecked={settings.marketplace_enabled}
          />
          Marketplace enabled
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="online_payments_enabled"
            value="1"
            defaultChecked={settings.online_payments_enabled}
          />
          Online payments enabled (future)
        </label>
        <Button type="submit" disabled={pending}>
          Save settings
        </Button>
      </form>

      <form
        className="grid max-w-xl gap-3 rounded-lg border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const res = await upsertCommissionRuleAction(fd);
            if (res.error) notify.error(res.error);
            else {
              notify.success("Commission rule saved");
              router.refresh();
            }
          });
        }}
      >
        <h2 className="text-base font-semibold">Commission rule</h2>
        <div className="space-y-1">
          <Label htmlFor="scope">Scope</Label>
          <select
            id="scope"
            name="scope"
            defaultValue="global"
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="global">Global</option>
            <option value="seller">Seller</option>
            <option value="category">Category</option>
            <option value="product">Product</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rate_pct">Rate %</Label>
          <Input id="rate_pct" name="rate_pct" type="number" step="0.01" defaultValue={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="seller_id">Seller ID (seller scope)</Label>
          <Input id="seller_id" name="seller_id" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="category_id">Category ID</Label>
          <Input id="category_id" name="category_id" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="product_id">Product ID</Label>
          <Input id="product_id" name="product_id" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          Add / replace rule
        </Button>
      </form>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Seller payout requests</h2>
        {payoutRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {payoutRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {r.marketplace_sellers?.shop_name ?? "Seller"} ·{" "}
                    {formatCurrency(Number(r.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.method} · {r.status} · {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["approved", "rejected", "held", "completed"] as const).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      disabled={pending || r.status === status}
                      onClick={() => {
                        startTransition(async () => {
                          const res = await reviewPayoutRequestAction(r.id, status);
                          if (res.error) notify.error(res.error);
                          else {
                            notify.success(`Marked ${status}`);
                            router.refresh();
                          }
                        });
                      }}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
