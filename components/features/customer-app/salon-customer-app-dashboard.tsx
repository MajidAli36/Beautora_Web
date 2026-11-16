"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PaginatedList } from "@/components/ui/table-pagination";
import {
  salonAddReel,
  salonCreateAppDeal,
  salonCreateAppProduct,
  salonCreatePointType,
  salonDeleteAppDeal,
  salonDeleteAppProduct,
  salonDeletePointType,
  salonDeleteReel,
  salonGrantTestPoints,
  salonPublishCustomerApp,
  salonSaveCustomerAppDraft,
  salonSaveLeaderboardRules,
  salonSaveLeaderboardTier,
  salonCreateNotification,
  salonDeleteNotification,
  salonSaveLoyaltyRules,
  salonToggleAppDeal,
  salonToggleAppProduct,
  salonToggleNotification,
  salonToggleReel,
  salonUpdatePointType,
  salonUpsertAppCustomer,
} from "@/lib/actions/customer-apps-salon";
import type { CustomerAppNotification } from "@/lib/customer-apps/notifications";
import type {
  AppBookingRow,
  AppCustomer,
  AppDeal,
  AppProduct,
  LeaderboardTier,
  PointType,
} from "@/lib/customer-apps/domain";
import type {
  CustomerAppReel,
  LeaderboardRules,
  LoyaltyRules,
} from "@/lib/customer-apps/engagement";
import type { CustomerAppRow, CustomerAppSettings } from "@/lib/customer-apps/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Tab =
  | "branding"
  | "customers"
  | "bookings"
  | "products"
  | "deals"
  | "points"
  | "notifications"
  | "leaderboard"
  | "reels";

const TABS: { id: Tab; label: string }[] = [
  { id: "branding", label: "Branding" },
  { id: "customers", label: "App customers" },
  { id: "bookings", label: "App bookings" },
  { id: "products", label: "App products" },
  { id: "deals", label: "Deals" },
  { id: "points", label: "Points & rules" },
  { id: "notifications", label: "Notifications" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "reels", label: "Reels" },
];

export function SalonCustomerAppDashboard(props: {
  app: CustomerAppRow | null;
  initialDraft: CustomerAppSettings | null;
  checklist: { key: string; label: string; ok: boolean }[];
  loyalty: LoyaltyRules | null;
  leaderboard: LeaderboardRules | null;
  reels: CustomerAppReel[];
  appCustomers: AppCustomer[];
  appBookings: AppBookingRow[];
  appProducts: AppProduct[];
  appDeals: AppDeal[];
  pointTypes: PointType[];
  leaderboardTiers: LeaderboardTier[];
  pointsHistory: {
    id: string;
    delta_points: number;
    balance_after: number;
    reason: string;
    point_type_id: string | null;
    customer_phone: string;
    created_at: string;
  }[];
  notifications: CustomerAppNotification[];
  services: { id: string; name: string }[];
}) {
  const {
    app,
    initialDraft,
    checklist,
    loyalty: initialLoyalty,
    leaderboard: initialLeaderboard,
    reels,
    appCustomers,
    appBookings,
    appProducts,
    appDeals,
    pointTypes,
    leaderboardTiers,
    pointsHistory,
    notifications,
    services,
  } = props;

  const router = useRouter();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<Tab>("branding");
  const [draft, setDraft] = useState(initialDraft);
  const [loyalty, setLoyalty] = useState(initialLoyalty);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);

  const [custForm, setCustForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [prodForm, setProdForm] = useState({ title: "", description: "", price: "0", imageUrl: "" });
  const [dealForm, setDealForm] = useState({
    title: "",
    description: "",
    discountPercent: "10",
    imageUrl: "",
  });
  const [pointForm, setPointForm] = useState({
    code: "",
    name: "",
    earnHint: "",
    color: "#0F766E",
  });
  const [grantForm, setGrantForm] = useState({ phone: "", points: "50", pointTypeId: "" });
  const [reelForm, setReelForm] = useState({
    title: "",
    caption: "",
    videoUrl: "",
    posterUrl: "",
  });
  const [notifForm, setNotifForm] = useState({
    title: "",
    body: "",
    kind: "announcement" as CustomerAppNotification["kind"],
  });
  const [tierEdits, setTierEdits] = useState<Record<number, LeaderboardTier>>(
    Object.fromEntries(leaderboardTiers.map((t) => [t.rank, t]))
  );

  if (!app || !draft) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center space-y-2">
        <h2 className="text-lg font-semibold">Customer app not enabled yet</h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Ask Beautora Super Admin to enable your customer app under Platform → Customer apps.
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
        <p className="text-sm text-muted-foreground">
          Status:{" "}
          <strong className="capitalize text-foreground">
            {app.status.replace(/_/g, " ")}
          </strong>{" "}
          · Slug <code>{app.slug}</code>
          <span className="block mt-1 text-xs">
            App customers, products, deals &amp; points are separate from salon CRM and marketplace.
            Bookings still use the shared appointments engine (tagged CUSTOMER_APP).
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => salonPublishCustomerApp(), "Published to customers")}
          >
            Publish live
          </Button>
          <Button variant="ghost" render={<Link href={`/a/${app.slug}`} target="_blank" />}>
            Web preview
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === t.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "branding" && (
        <section className="space-y-4 rounded-lg border p-4">
          <ul className="grid gap-1 sm:grid-cols-2 text-sm">
            {checklist.map((c) => (
              <li key={c.key}>
                <span className={c.ok ? "text-emerald-600" : "text-amber-600"}>
                  {c.ok ? "✓" : "○"}
                </span>{" "}
                {c.label}
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="App name">
              <Input
                value={draft.branding.appName}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    branding: { ...draft.branding, appName: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Salon display name">
              <Input
                value={draft.branding.salonDisplayName}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    branding: { ...draft.branding, salonDisplayName: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="WhatsApp">
              <Input
                value={draft.branding.whatsappNumber}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    branding: { ...draft.branding, whatsappNumber: e.target.value },
                  })
                }
              />
            </Field>
            <Field label="Support phone">
              <Input
                value={draft.branding.supportPhone}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    branding: { ...draft.branding, supportPhone: e.target.value },
                  })
                }
              />
            </Field>
          </div>
          <Field label="Short description">
            <Textarea
              value={draft.branding.shortDescription}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  branding: { ...draft.branding, shortDescription: e.target.value },
                })
              }
            />
          </Field>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => salonSaveCustomerAppDraft(draft), "Branding draft saved")
            }
          >
            Save branding
          </Button>
        </section>
      )}

      {tab === "customers" && (
        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            App customers are separate from salon POS CRM. You can optionally link a salon
            customer later.
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            <Input
              placeholder="First name"
              value={custForm.firstName}
              onChange={(e) => setCustForm({ ...custForm, firstName: e.target.value })}
            />
            <Input
              placeholder="Last name"
              value={custForm.lastName}
              onChange={(e) => setCustForm({ ...custForm, lastName: e.target.value })}
            />
            <Input
              placeholder="Phone *"
              value={custForm.phone}
              onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
            />
            <Input
              placeholder="Email"
              value={custForm.email}
              onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
            />
          </div>
          <Button
            disabled={pending || !custForm.phone.trim()}
            onClick={() =>
              run(async () => {
                const res = await salonUpsertAppCustomer(custForm);
                if (!res.error) {
                  setCustForm({ firstName: "", lastName: "", phone: "", email: "" });
                }
                return res;
              }, "App customer saved")
            }
          >
            Add / update app customer
          </Button>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Linked salon CRM</th>
                </tr>
              </thead>
              <tbody>
                {appCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                      No app customers yet.
                    </td>
                  </tr>
                ) : (
                  appCustomers.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="px-3 py-2">
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="px-3 py-2">{c.phone}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.salon_customer_id ? "Linked" : "Not linked"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "bookings" && (
        <section className="space-y-3 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Only bookings that came through this customer app (source CUSTOMER_APP). Same
            records also appear in salon Appointments.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Booking #</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {appBookings.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      No app bookings yet.
                    </td>
                  </tr>
                ) : (
                  appBookings.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-3 py-2">
                        {new Date(b.scheduled_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">{b.status}</td>
                      <td className="px-3 py-2">{b.booking_number || "—"}</td>
                      <td className="px-3 py-2">{b.source}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "products" && (
        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            App catalog is separate from Marketplace and from raw POS inventory. Optionally
            leave POS link empty for app-only items.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Title *"
              value={prodForm.title}
              onChange={(e) => setProdForm({ ...prodForm, title: e.target.value })}
            />
            <Input
              placeholder="Price"
              type="number"
              value={prodForm.price}
              onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })}
            />
            <Input
              placeholder="Image URL"
              value={prodForm.imageUrl}
              onChange={(e) => setProdForm({ ...prodForm, imageUrl: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={prodForm.description}
              onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
            />
          </div>
          <Button
            disabled={pending || !prodForm.title.trim()}
            onClick={() =>
              run(async () => {
                const res = await salonCreateAppProduct({
                  title: prodForm.title,
                  description: prodForm.description,
                  price: Number(prodForm.price) || 0,
                  imageUrl: prodForm.imageUrl,
                });
                if (!res.error) {
                  setProdForm({ title: "", description: "", price: "0", imageUrl: "" });
                }
                return res;
              }, "App product added")
            }
          >
            Add app product
          </Button>
          <div className="space-y-2">
            {appProducts.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div>
                  <p className="font-medium text-sm">
                    {p.title} · {p.price}
                    {!p.is_active ? " (hidden)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => salonToggleAppProduct(p.id, !p.is_active),
                        p.is_active ? "Hidden" : "Shown"
                      )
                    }
                  >
                    {p.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => salonDeleteAppProduct(p.id), "Deleted")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "deals" && (
        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Customer-app deals only (not marketplace or POS promos).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Title *"
              value={dealForm.title}
              onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
            />
            <Input
              placeholder="Discount %"
              type="number"
              value={dealForm.discountPercent}
              onChange={(e) =>
                setDealForm({ ...dealForm, discountPercent: e.target.value })
              }
            />
            <Input
              placeholder="Image URL"
              value={dealForm.imageUrl}
              onChange={(e) => setDealForm({ ...dealForm, imageUrl: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={dealForm.description}
              onChange={(e) => setDealForm({ ...dealForm, description: e.target.value })}
            />
          </div>
          <Button
            disabled={pending || !dealForm.title.trim()}
            onClick={() =>
              run(async () => {
                const res = await salonCreateAppDeal({
                  title: dealForm.title,
                  description: dealForm.description,
                  discountPercent: Number(dealForm.discountPercent) || null,
                  imageUrl: dealForm.imageUrl,
                  isPublished: true,
                });
                if (!res.error) {
                  setDealForm({
                    title: "",
                    description: "",
                    discountPercent: "10",
                    imageUrl: "",
                  });
                }
                return res;
              }, "Deal added")
            }
          >
            Add deal
          </Button>
          <div className="space-y-2">
            {appDeals.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div>
                  <p className="font-medium text-sm">
                    {d.title}
                    {d.discount_percent != null ? ` · ${d.discount_percent}%` : ""}
                    {d.is_published ? "" : " (draft)"}
                  </p>
                  <p className="text-xs text-muted-foreground">{d.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => salonToggleAppDeal(d.id, !d.is_published),
                        d.is_published ? "Unpublished" : "Published"
                      )
                    }
                  >
                    {d.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => salonDeleteAppDeal(d.id), "Deleted")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "points" && (
        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Create any point types (visit, referral, purchase…). Customers see history per type
            in the app.
          </p>
          {loyalty && (
            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={loyalty.enabled}
                  onChange={(e) => setLoyalty({ ...loyalty, enabled: e.target.checked })}
                />
                Enable points on customer app
              </label>
              <p className="text-xs text-muted-foreground">
                These rules are saved on the backend and shown as readable text in the customer
                app (Rewards + Notifications → How to earn).
              </p>
              <Textarea
                value={loyalty.rules_note}
                onChange={(e) => setLoyalty({ ...loyalty, rules_note: e.target.value })}
                placeholder="Customer-facing rules note (shown at the top of How to earn)"
                rows={3}
              />
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">Points / completed booking</span>
                  <Input
                    type="number"
                    min={0}
                    value={loyalty.points_per_completed_booking}
                    onChange={(e) =>
                      setLoyalty({
                        ...loyalty,
                        points_per_completed_booking: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">Points / product purchase</span>
                  <Input
                    type="number"
                    min={0}
                    value={loyalty.points_per_product_purchase}
                    onChange={(e) =>
                      setLoyalty({
                        ...loyalty,
                        points_per_product_purchase: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">Points per currency spent</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={loyalty.points_per_currency}
                    onChange={(e) =>
                      setLoyalty({
                        ...loyalty,
                        points_per_currency: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">Welcome bonus</span>
                  <Input
                    type="number"
                    min={0}
                    value={loyalty.welcome_bonus_points}
                    onChange={(e) =>
                      setLoyalty({
                        ...loyalty,
                        welcome_bonus_points: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">Min redeem points</span>
                  <Input
                    type="number"
                    min={0}
                    value={loyalty.min_redeem_points}
                    onChange={(e) =>
                      setLoyalty({
                        ...loyalty,
                        min_redeem_points: Number(e.target.value) || 0,
                      })
                    }
                  />
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-muted-foreground">Redeem points ≈ 1 currency</span>
                  <Input
                    type="number"
                    min={1}
                    step="0.01"
                    value={loyalty.redeem_points_per_currency}
                    onChange={(e) =>
                      setLoyalty({
                        ...loyalty,
                        redeem_points_per_currency: Number(e.target.value) || 1,
                      })
                    }
                  />
                </label>
              </div>
              <Button
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => salonSaveLoyaltyRules(loyalty), "Loyalty rules saved")
                }
              >
                Save points rules
              </Button>
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Code (e.g. referral)"
              value={pointForm.code}
              onChange={(e) => setPointForm({ ...pointForm, code: e.target.value })}
            />
            <Input
              placeholder="Display name *"
              value={pointForm.name}
              onChange={(e) => setPointForm({ ...pointForm, name: e.target.value })}
            />
            <Input
              placeholder="Earn hint"
              value={pointForm.earnHint}
              onChange={(e) => setPointForm({ ...pointForm, earnHint: e.target.value })}
            />
            <Input
              placeholder="Color"
              value={pointForm.color}
              onChange={(e) => setPointForm({ ...pointForm, color: e.target.value })}
            />
          </div>
          <Button
            disabled={pending || !pointForm.name.trim() || !pointForm.code.trim()}
            onClick={() =>
              run(async () => {
                const res = await salonCreatePointType(pointForm);
                if (!res.error) {
                  setPointForm({ code: "", name: "", earnHint: "", color: "#0F766E" });
                }
                return res;
              }, "Point type created")
            }
          >
            Add point type
          </Button>
          <div className="space-y-2">
            {pointTypes.map((pt) => (
              <div
                key={pt.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ background: pt.color }}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {pt.name} <code className="text-xs">{pt.code}</code>
                    </p>
                    <p className="text-xs text-muted-foreground">{pt.earn_hint}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          salonUpdatePointType(pt.id, { is_active: !pt.is_active }),
                        pt.is_active ? "Disabled" : "Enabled"
                      )
                    }
                  >
                    {pt.is_active ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => salonDeletePointType(pt.id), "Deleted")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Grant points (test / adjustment)</p>
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-[140px]"
                placeholder="Phone"
                value={grantForm.phone}
                onChange={(e) => setGrantForm({ ...grantForm, phone: e.target.value })}
              />
              <Input
                className="max-w-[90px]"
                type="number"
                value={grantForm.points}
                onChange={(e) => setGrantForm({ ...grantForm, points: e.target.value })}
              />
              <select
                className="rounded-md border bg-background px-2 py-2 text-sm"
                value={grantForm.pointTypeId || pointTypes[0]?.id || ""}
                onChange={(e) =>
                  setGrantForm({ ...grantForm, pointTypeId: e.target.value })
                }
              >
                {pointTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                disabled={pending || !grantForm.phone.trim()}
                onClick={() =>
                  run(
                    () =>
                      salonGrantTestPoints(
                        grantForm.phone,
                        Number(grantForm.points) || 0,
                        grantForm.pointTypeId || pointTypes[0]?.id
                      ),
                    "Points granted"
                  )
                }
              >
                Grant
              </Button>
            </div>
          </div>
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm font-medium">Recent points history</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Δ</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-muted-foreground"
                      >
                        No ledger entries yet.
                      </td>
                    </tr>
                  ) : (
                    pointsHistory.map((h) => (
                      <tr key={h.id} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap">
                          {new Date(h.created_at).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">{h.customer_phone}</td>
                        <td className="px-3 py-2">
                          {h.delta_points > 0 ? "+" : ""}
                          {h.delta_points}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {pointTypes.find((t) => t.id === h.point_type_id)?.name ||
                            "—"}
                        </td>
                        <td className="px-3 py-2">{h.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "notifications" && (
        <section className="space-y-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            Messages appear in the customer app inbox. Loyalty “how to earn” rules are also
            auto-shown there from the Points &amp; rules tab.
          </p>
          <div className="grid gap-2">
            <Input
              placeholder="Title *"
              value={notifForm.title}
              onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
            />
            <Textarea
              placeholder="Message body (plain text) *"
              rows={4}
              value={notifForm.body}
              onChange={(e) => setNotifForm({ ...notifForm, body: e.target.value })}
            />
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={notifForm.kind}
              onChange={(e) =>
                setNotifForm({
                  ...notifForm,
                  kind: e.target.value as CustomerAppNotification["kind"],
                })
              }
            >
              <option value="announcement">Announcement</option>
              <option value="promo">Promo</option>
              <option value="rules">Rules</option>
              <option value="reminder">Reminder</option>
            </select>
            <Button
              disabled={pending || !notifForm.title.trim() || !notifForm.body.trim()}
              onClick={() =>
                run(async () => {
                  const res = await salonCreateNotification({
                    ...notifForm,
                    publish: true,
                  });
                  if (!res.error) {
                    setNotifForm({ title: "", body: "", kind: "announcement" });
                  }
                  return res;
                }, "Notification published")
              }
            >
              Publish to customer app
            </Button>
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No salon notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {n.title}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {n.kind}
                        {n.is_published ? " · live" : " · draft"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {n.body}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () => salonToggleNotification(n.id, !n.is_published),
                          n.is_published ? "Unpublished" : "Published"
                        )
                      }
                    >
                      {n.is_published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        run(() => salonDeleteNotification(n.id), "Deleted")
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {tab === "leaderboard" && leaderboard && (
        <section className="space-y-4 rounded-lg border p-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={leaderboard.enabled}
              onChange={(e) =>
                setLeaderboard({ ...leaderboard, enabled: e.target.checked })
              }
            />
            Enable leaderboard
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={leaderboard.title}
                onChange={(e) =>
                  setLeaderboard({ ...leaderboard, title: e.target.value })
                }
              />
            </Field>
            <Field label="Window (days)">
              <Input
                type="number"
                value={leaderboard.window_days}
                onChange={(e) =>
                  setLeaderboard({
                    ...leaderboard,
                    window_days: Number(e.target.value) || 30,
                  })
                }
              />
            </Field>
          </div>
          <Button
            disabled={pending}
            onClick={() =>
              run(
                () => salonSaveLeaderboardRules(leaderboard),
                "Leaderboard settings saved"
              )
            }
          >
            Save leaderboard settings
          </Button>

          <h3 className="font-semibold pt-2">Reward tiers (1st / 2nd / 3rd…)</h3>
          <p className="text-sm text-muted-foreground">
            Each rank can show a reward image for a service, app product, or custom prize.
          </p>
          {[1, 2, 3].map((rank) => {
            const tier =
              tierEdits[rank] ||
              leaderboardTiers.find((t) => t.rank === rank) ||
              ({
                id: "",
                customer_app_id: app.id,
                rank,
                title: `${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"} place`,
                description: "",
                reward_kind: "custom" as const,
                reward_image_url: null,
                service_id: null,
                app_product_id: null,
                custom_reward_label: "",
              } satisfies LeaderboardTier);
            return (
              <div key={rank} className="rounded-md border p-3 space-y-2">
                <p className="text-sm font-medium">Rank #{rank}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Title"
                    value={tier.title}
                    onChange={(e) =>
                      setTierEdits({
                        ...tierEdits,
                        [rank]: { ...tier, title: e.target.value },
                      })
                    }
                  />
                  <select
                    className="rounded-md border bg-background px-2 py-2 text-sm"
                    value={tier.reward_kind}
                    onChange={(e) =>
                      setTierEdits({
                        ...tierEdits,
                        [rank]: {
                          ...tier,
                          reward_kind: e.target.value as LeaderboardTier["reward_kind"],
                        },
                      })
                    }
                  >
                    <option value="custom">Custom reward</option>
                    <option value="service">Service reward</option>
                    <option value="product">App product reward</option>
                  </select>
                  <Input
                    placeholder="Reward image URL"
                    value={tier.reward_image_url || ""}
                    onChange={(e) =>
                      setTierEdits({
                        ...tierEdits,
                        [rank]: { ...tier, reward_image_url: e.target.value },
                      })
                    }
                  />
                  {tier.reward_kind === "custom" ? (
                    <Input
                      placeholder="Custom reward label"
                      value={tier.custom_reward_label}
                      onChange={(e) =>
                        setTierEdits({
                          ...tierEdits,
                          [rank]: { ...tier, custom_reward_label: e.target.value },
                        })
                      }
                    />
                  ) : null}
                  {tier.reward_kind === "service" ? (
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={tier.service_id || ""}
                      onChange={(e) =>
                        setTierEdits({
                          ...tierEdits,
                          [rank]: { ...tier, service_id: e.target.value || null },
                        })
                      }
                    >
                      <option value="">Select service</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {tier.reward_kind === "product" ? (
                    <select
                      className="rounded-md border bg-background px-2 py-2 text-sm"
                      value={tier.app_product_id || ""}
                      onChange={(e) =>
                        setTierEdits({
                          ...tierEdits,
                          [rank]: { ...tier, app_product_id: e.target.value || null },
                        })
                      }
                    >
                      <option value="">Select app product</option>
                      {appProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <Textarea
                  placeholder="Description shown to customers"
                  value={tier.description}
                  onChange={(e) =>
                    setTierEdits({
                      ...tierEdits,
                      [rank]: { ...tier, description: e.target.value },
                    })
                  }
                />
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    const t = tierEdits[rank] || tier;
                    run(
                      () =>
                        salonSaveLeaderboardTier({
                          rank,
                          title: t.title,
                          description: t.description,
                          rewardKind: t.reward_kind,
                          rewardImageUrl: t.reward_image_url,
                          serviceId: t.service_id,
                          appProductId: t.app_product_id,
                          customRewardLabel: t.custom_reward_label,
                        }),
                      `Rank ${rank} saved`
                    );
                  }}
                >
                  Save tier #{rank}
                </Button>
              </div>
            );
          })}
        </section>
      )}

      {tab === "reels" && (
        <section className="space-y-4 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <Input
                value={reelForm.title}
                onChange={(e) => setReelForm({ ...reelForm, title: e.target.value })}
              />
            </Field>
            <Field label="Video URL (mp4)">
              <Input
                value={reelForm.videoUrl}
                onChange={(e) => setReelForm({ ...reelForm, videoUrl: e.target.value })}
              />
            </Field>
            <Field label="Poster URL">
              <Input
                value={reelForm.posterUrl}
                onChange={(e) => setReelForm({ ...reelForm, posterUrl: e.target.value })}
              />
            </Field>
            <Field label="Caption">
              <Input
                value={reelForm.caption}
                onChange={(e) => setReelForm({ ...reelForm, caption: e.target.value })}
              />
            </Field>
          </div>
          <Button
            disabled={pending || !reelForm.videoUrl.trim()}
            onClick={() =>
              run(async () => {
                const res = await salonAddReel(reelForm);
                if (!res.error) {
                  setReelForm({ title: "", caption: "", videoUrl: "", posterUrl: "" });
                }
                return res;
              }, "Reel added")
            }
          >
            Add reel
          </Button>
          <div className="space-y-2">
            {reels.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div>
                  <p className="font-medium text-sm">{r.title || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-md">
                    {r.video_url}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => salonToggleReel(r.id, !r.is_published),
                        r.is_published ? "Unpublished" : "Published"
                      )
                    }
                  >
                    {r.is_published ? "Unpublish" : "Publish"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => salonDeleteReel(r.id), "Deleted")}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
