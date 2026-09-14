"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listPlatformMarketplaceCommissions,
  listPlatformMarketplaceReviews,
  listPlatformMarketplaceSellers,
  listPlatformPendingProducts,
  markMarketplaceCommissionsPaid,
  moderateMarketplaceProduct,
  setMarketplaceReviewHidden,
  setMarketplaceSellerStatus,
} from "@/lib/marketplace/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";

type Seller = Awaited<ReturnType<typeof listPlatformMarketplaceSellers>>[number];
type Product = Awaited<ReturnType<typeof listPlatformPendingProducts>>[number];
type Commission = Awaited<ReturnType<typeof listPlatformMarketplaceCommissions>>[number];
type Review = Awaited<ReturnType<typeof listPlatformMarketplaceReviews>>[number];

export function PlatformMarketplacePanel({
  sellers,
  products,
  commissions,
  reviews,
}: {
  sellers: Seller[];
  products: Product[];
  commissions: Commission[];
  reviews: Review[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <section className="mt-10 space-y-6 border-t pt-8">
      <div>
        <h2 className="text-lg font-semibold">Marketplace moderation</h2>
        <p className="text-sm text-muted-foreground">
          Salon Management & Marketplace — approve sellers and products, settle 10% commissions,
          and moderate reviews. Completely separate from salon SaaS billing and POS.
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Sellers
        </h3>
        <ul className="divide-y rounded-lg border">
          {sellers.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">No sellers yet.</li>
          ) : (
            sellers.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div>
                  <p className="font-medium">
                    {s.shop_name}{" "}
                    <Badge variant="outline" className="ml-1">
                      {s.status}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">/{s.slug}</p>
                </div>
                <div className="flex gap-2">
                  {s.status !== "approved" ? (
                    <Button
                      size="sm"
                      disabled={busy === s.id || pending}
                      onClick={() => {
                        setBusy(s.id);
                        startTransition(async () => {
                          const r = await setMarketplaceSellerStatus(s.id, "approved");
                          setBusy(null);
                          if (r.error) notify.error(r.error);
                          else {
                            notify.success("Seller approved");
                            refresh();
                          }
                        });
                      }}
                    >
                      Approve
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy === s.id || pending}
                      onClick={() => {
                        setBusy(s.id);
                        startTransition(async () => {
                          const r = await setMarketplaceSellerStatus(s.id, "suspended");
                          setBusy(null);
                          if (r.error) notify.error(r.error);
                          else {
                            notify.success("Seller suspended");
                            refresh();
                          }
                        });
                      }}
                    >
                      Suspend
                    </Button>
                  )}
                  {s.status === "suspended" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === s.id || pending}
                      onClick={() => {
                        setBusy(s.id);
                        startTransition(async () => {
                          const r = await setMarketplaceSellerStatus(s.id, "approved");
                          setBusy(null);
                          if (r.error) notify.error(r.error);
                          else {
                            notify.success("Seller re-approved");
                            refresh();
                          }
                        });
                      }}
                    >
                      Re-approve
                    </Button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Products
        </h3>
        <ul className="divide-y rounded-lg border">
          {products.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">No products.</li>
          ) : (
            products.map((p) => {
              const seller = (
                p as Product & { marketplace_sellers?: { shop_name: string } | null }
              ).marketplace_sellers;
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">
                      {p.title}{" "}
                      <Badge variant="outline" className="ml-1">
                        {p.status}
                      </Badge>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {seller?.shop_name ?? "Seller"} · {formatCurrency(Number(p.price))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {p.status !== "published" ? (
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const r = await moderateMarketplaceProduct(p.id, "published");
                            if (r.error) notify.error(r.error);
                            else {
                              notify.success("Published");
                              refresh();
                            }
                          });
                        }}
                      >
                        Publish
                      </Button>
                    ) : null}
                    {p.status !== "rejected" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            const r = await moderateMarketplaceProduct(
                              p.id,
                              "rejected",
                              "Does not meet guidelines"
                            );
                            if (r.error) notify.error(r.error);
                            else {
                              notify.success("Product rejected");
                              refresh();
                            }
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Commissions owed
        </h3>
        <ul className="divide-y rounded-lg border">
          {commissions.filter((c) => c.payout_status === "owed").length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">Nothing owed.</li>
          ) : (
            Array.from(
              commissions
                .filter((c) => c.payout_status === "owed")
                .reduce((map, c) => {
                  const cur = map.get(c.seller_id) ?? {
                    sellerId: c.seller_id,
                    name:
                      (
                        c as Commission & {
                          marketplace_sellers?: { shop_name: string } | null;
                        }
                      ).marketplace_sellers?.shop_name ?? "Seller",
                    amount: 0,
                  };
                  cur.amount += Number(c.commission_amount);
                  map.set(c.seller_id, cur);
                  return map;
                }, new Map<string, { sellerId: string; name: string; amount: number }>())
                .values()
            ).map((row) => (
              <li
                key={row.sellerId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
              >
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Owed {formatCurrency(row.amount)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const r = await markMarketplaceCommissionsPaid(row.sellerId);
                      if (r.error) notify.error(r.error);
                      else {
                        notify.success("Marked paid");
                        refresh();
                      }
                    });
                  }}
                >
                  Mark paid
                </Button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Reviews
        </h3>
        <ul className="divide-y rounded-lg border">
          {reviews.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">No reviews.</li>
          ) : (
            reviews.map((r) => {
              const title = (
                r as Review & { marketplace_products?: { title: string } | null }
              ).marketplace_products?.title;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">
                      {title ?? "Product"} · {r.rating}/5
                      {r.is_hidden ? (
                        <Badge variant="secondary" className="ml-2">
                          hidden
                        </Badge>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.reviewer_name}
                      {r.comment ? ` — ${r.comment}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const res = await setMarketplaceReviewHidden(r.id, !r.is_hidden);
                        if (res.error) notify.error(res.error);
                        else {
                          notify.success(r.is_hidden ? "Review unhidden." : "Review hidden.");
                          refresh();
                        }
                      });
                    }}
                  >
                    {r.is_hidden ? "Unhide" : "Hide"}
                  </Button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </section>
  );
}
