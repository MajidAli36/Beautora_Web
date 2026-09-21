"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  listPlatformMarketplaceCommissions,
  listPlatformMarketplaceReviews,
  listPlatformPendingProducts,
  markMarketplaceCommissionsPaid,
  moderateMarketplaceProduct,
  setMarketplaceReviewHidden,
  setMarketplaceSellerStatus,
  type PlatformMarketplaceSeller,
} from "@/lib/marketplace/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";

type Seller = PlatformMarketplaceSeller;
type Product = Awaited<ReturnType<typeof listPlatformPendingProducts>>[number];
type Commission = Awaited<ReturnType<typeof listPlatformMarketplaceCommissions>>[number];
type Review = Awaited<ReturnType<typeof listPlatformMarketplaceReviews>>[number];

function dash(value: string | null | undefined) {
  const t = value?.trim();
  return t ? t : "—";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sellerStatusBadge(status: Seller["status"]) {
  if (status === "approved") return <Badge variant="success">Approved</Badge>;
  if (status === "pending") return <Badge variant="warning">Pending</Badge>;
  return <Badge variant="destructive">Suspended</Badge>;
}

function SellerContactPhone(s: Seller) {
  return (
    s.phone ||
    s.organizationWhatsapp ||
    s.organizationPhone ||
    s.ownerAuthPhone ||
    null
  );
}

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
  const [openId, setOpenId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  return (
    <section className="mt-10 space-y-6 border-t pt-8">
      <div>
        <h2 className="text-lg font-semibold">Marketplace moderation</h2>
        <p className="text-sm text-muted-foreground">
          Review each seller carefully before approving. Check shop phone, owner login,
          linked salon, and bio. Completely separate from salon SaaS billing and POS.
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
            sellers.map((s) => {
              const contactPhone = SellerContactPhone(s);
              const open = openId === s.id;
              return (
                <li key={s.id} className="px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{s.shop_name}</p>
                        {sellerStatusBadge(s.status)}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        /{s.slug}
                        {s.ownerEmail ? ` · ${s.ownerEmail}` : ""}
                        {contactPhone ? ` · ${contactPhone}` : " · no phone on file"}
                        {" · applied "}
                        {new Date(s.created_at).toLocaleDateString("en-PK")}
                        {" · "}
                        {s.productCount} product{s.productCount === 1 ? "" : "s"}
                      </p>
                      {s.organizationName ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Linked salon: {s.organizationName}
                          {s.organizationCity ? ` · ${s.organizationCity}` : ""}
                          {s.organizationCountry ? `, ${s.organizationCountry}` : ""}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No linked salon organization
                        </p>
                      )}
                      {s.bio ? (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {s.bio}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={open ? "secondary" : "outline"}
                        onClick={() => setOpenId(open ? null : s.id)}
                      >
                        {open ? "Hide details" : "Details"}
                      </Button>
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
                  </div>

                  {open ? (
                    <div className="mt-3 rounded-md border bg-muted/30 p-3">
                      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Detail label="Shop name" value={s.shop_name} />
                        <Detail label="Slug" value={`/${s.slug}`} mono />
                        <Detail label="Status" value={s.status} />
                        <Detail
                          label="Seller phone"
                          value={dash(s.phone)}
                          note={
                            !s.phone
                              ? "Not collected at registration (older sellers)"
                              : null
                          }
                        />
                        <Detail label="Owner email" value={dash(s.ownerEmail)} />
                        <Detail label="Owner name" value={dash(s.ownerName)} />
                        <Detail label="Owner auth phone" value={dash(s.ownerAuthPhone)} />
                        <Detail label="Owner user ID" value={s.user_id} mono />
                        <Detail label="Applied" value={formatDate(s.created_at)} />
                        <Detail label="Updated" value={formatDate(s.updated_at)} />
                        <Detail label="Products" value={String(s.productCount)} />
                        <Detail label="Bio" value={dash(s.bio)} />
                        <Detail label="Payout notes" value={dash(s.payout_notes)} />
                        <Detail
                          label="Linked salon"
                          value={
                            s.organizationName
                              ? `${s.organizationName}${s.organizationSlug ? ` (/${s.organizationSlug})` : ""}`
                              : "—"
                          }
                        />
                        <Detail label="Salon phone" value={dash(s.organizationPhone)} />
                        <Detail
                          label="Salon WhatsApp"
                          value={dash(s.organizationWhatsapp)}
                        />
                        <Detail
                          label="Salon location"
                          value={
                            [s.organizationCity, s.organizationCountry]
                              .filter(Boolean)
                              .join(", ") || "—"
                          }
                        />
                        <Detail
                          label="Organization ID"
                          value={dash(s.organization_id)}
                          mono
                        />
                      </dl>
                    </div>
                  ) : null}
                </li>
              );
            })
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
                          });
                        }}
                      >
                        Reject
                      </Button>
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

function Detail({
  label,
  value,
  mono,
  note,
}: {
  label: string;
  value: string;
  mono?: boolean;
  note?: string | null;
}) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 break-all text-sm font-medium ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
      {note ? <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p> : null}
    </div>
  );
}
