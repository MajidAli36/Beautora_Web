"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  Banknote,
  Building2,
  CreditCard,
  Store,
  UserRound,
} from "lucide-react";
import { updateSellerStoreProfile } from "@/lib/marketplace/catalog";
import { setOrganizationMarketplaceStore } from "@/lib/marketplace/buyer";
import type { ActionResult } from "@/types/commerce";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Seller = Database["public"]["Tables"]["marketplace_sellers"]["Row"];

type TabId = "account" | "shop" | "cod" | "card" | "storefront";

const TABS: { id: TabId; label: string; icon: typeof UserRound }[] = [
  { id: "account", label: "Account", icon: UserRound },
  { id: "shop", label: "Shop", icon: Store },
  { id: "cod", label: "COD", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "storefront", label: "Storefront", icon: Building2 },
];

const DEFAULT_COD_TERMS = `• Pay the full order amount in cash when the courier delivers.
• Inspect the parcel before paying; refuse damaged or wrong items.
• Keep your order number ready for the rider.
• COD is unavailable for orders outside our delivery area.
• Failed delivery attempts may cancel the order after notice.`;

const DEFAULT_CARD_INSTRUCTIONS = `1. Transfer the order total to the account above.
2. Use your order number as the payment reference.
3. Keep the receipt — seller confirms payment, then Beautora emails your paid invoice.`;

export function SellerStoreSettingsForm({
  seller,
  canToggleOrgStore,
  orgStoreEnabled,
  accountEmailFallback,
}: {
  seller: Seller;
  canToggleOrgStore: boolean;
  orgStoreEnabled: boolean;
  accountEmailFallback?: string | null;
}) {
  const [state, action, pending] = useActionState(
    updateSellerStoreProfile,
    {} as ActionResult
  );
  const [orgPending, startOrg] = useTransition();
  const [tab, setTab] = useState<TabId>("account");
  const [acceptsCod, setAcceptsCod] = useState(
    seller.accepts_cod ?? seller.supports_cod !== false
  );
  const [acceptsCard, setAcceptsCard] = useState(seller.accepts_card ?? false);

  useEffect(() => {
    if (state?.error) notify.error(state.error);
    if (state?.success) notify.success("Settings saved");
  }, [state]);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="publish" value="1" />
      <input type="hidden" name="accepts_cod" value={acceptsCod ? "1" : "0"} />
      <input type="hidden" name="accepts_card" value={acceptsCard ? "1" : "0"} />

      <div className="max-w-full overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div
          role="tablist"
          className="inline-flex min-w-max gap-1 border-b border-border pb-px"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {t.label}
                {t.id === "cod" && acceptsCod ? (
                  <Badge variant="success" className="ml-0.5">
                    On
                  </Badge>
                ) : null}
                {t.id === "card" && acceptsCard ? (
                  <Badge variant="success" className="ml-0.5">
                    On
                  </Badge>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep all panels mounted so inactive fields still submit */}
      <div className={cn("space-y-5 pt-1", tab !== "account" && "hidden")}>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Account</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Contact details used for invoices and buyer messages.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account_email">Account email</Label>
            <Input
              id="account_email"
              name="account_email"
              type="email"
              defaultValue={seller.account_email ?? accountEmailFallback ?? ""}
              placeholder="you@business.com"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="invoice_email">Invoice email (optional)</Label>
            <Input
              id="invoice_email"
              name="invoice_email"
              type="email"
              defaultValue={seller.invoice_email ?? ""}
              placeholder="billing@business.com"
            />
            <p className="text-[11px] text-muted-foreground">
              Buyers get an invoice on COD place, and a paid invoice when you confirm card
              payment.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={seller.phone ?? ""} />
          </div>
        </div>
      </div>

      <div className={cn("space-y-5 pt-1", tab !== "shop" && "hidden")}>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Shop profile</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Public storefront details on Beautora Marketplace.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shop_name">Shop name</Label>
            <Input
              id="shop_name"
              name="shop_name"
              defaultValue={seller.shop_name}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={3} defaultValue={seller.bio ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="delivery_notes">Delivery notes</Label>
            <Textarea
              id="delivery_notes"
              name="delivery_notes"
              rows={2}
              defaultValue={seller.delivery_notes ?? ""}
              placeholder="Cities covered, timing, packing notes…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={seller.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" name="country" defaultValue={seller.country ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input id="logo_url" name="logo_url" defaultValue={seller.logo_url ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cover_url">Cover URL</Label>
            <Input id="cover_url" name="cover_url" defaultValue={seller.cover_url ?? ""} />
          </div>
        </div>
      </div>

      <div className={cn("space-y-5 pt-1", tab !== "cod" && "hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Cash on delivery</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Terms shown to buyers when they choose COD. Invoice emails when the order is
              placed.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={acceptsCod}
            onClick={() => setAcceptsCod((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
              acceptsCod ? "border-primary bg-primary" : "border-border bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
                acceptsCod ? "left-6" : "left-0.5"
              )}
            />
          </button>
        </div>

        <div
          className={cn(
            "space-y-4 rounded-xl border p-4 transition-opacity",
            !acceptsCod && "opacity-50"
          )}
        >
          <div className="space-y-2">
            <Label htmlFor="cod_terms">COD terms</Label>
            <Textarea
              id="cod_terms"
              name="cod_terms"
              rows={8}
              defaultValue={seller.cod_terms ?? DEFAULT_COD_TERMS}
              placeholder="Payment rules, inspection policy, cancellation…"
            />
            <p className="text-[11px] text-muted-foreground">
              Clear terms reduce disputes. Keep them short and buyer-friendly.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cod_prep_note">Preparation / lead time (optional)</Label>
            <Input
              id="cod_prep_note"
              name="cod_prep_note"
              defaultValue={seller.cod_prep_note ?? ""}
              placeholder="e.g. Ships in 1–2 business days · COD across Pakistan"
            />
          </div>
        </div>
      </div>

      <div className={cn("space-y-5 pt-1", tab !== "card" && "hidden")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Card / online payment</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Account details for buyers paying by card or transfer. Confirm payment on the
              order to email the paid invoice.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={acceptsCard}
            onClick={() => setAcceptsCard((v) => !v)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-colors",
              acceptsCard ? "border-primary bg-primary" : "border-border bg-muted"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-background shadow transition-transform",
                acceptsCard ? "left-6" : "left-0.5"
              )}
            />
          </button>
        </div>

        <div
          className={cn(
            "space-y-4 rounded-xl border p-4 transition-opacity",
            !acceptsCard && "opacity-50"
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card_account_title">Account / merchant title</Label>
              <Input
                id="card_account_title"
                name="card_account_title"
                defaultValue={seller.card_account_title ?? ""}
                placeholder="Shop legal name or JazzCash title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card_account_number">Account / wallet number</Label>
              <Input
                id="card_account_number"
                name="card_account_number"
                defaultValue={seller.card_account_number ?? ""}
                placeholder="IBAN, card last digits, or JazzCash #"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card_bank_name">Bank / provider</Label>
              <Input
                id="card_bank_name"
                name="card_bank_name"
                defaultValue={seller.card_bank_name ?? ""}
                placeholder="HBL, Meezan, JazzCash, EasyPaisa…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card_networks">Accepted networks</Label>
              <Input
                id="card_networks"
                name="card_networks"
                defaultValue={seller.card_networks ?? "Visa, Mastercard, JazzCash, EasyPaisa"}
                placeholder="Visa, Mastercard…"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="card_instructions">Payment instructions</Label>
              <Textarea
                id="card_instructions"
                name="card_instructions"
                rows={5}
                defaultValue={seller.card_instructions ?? DEFAULT_CARD_INSTRUCTIONS}
                placeholder="How buyers should pay and what reference to use…"
              />
            </div>
          </div>
          <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
            Card payments stay <strong>pending</strong> until you tap{" "}
            <strong>Confirm card payment</strong> on the order. That carefully sends the paid
            invoice email to the buyer.
          </p>
        </div>
      </div>

      <div className={cn("space-y-5 pt-1", tab !== "storefront" && "hidden")}>
        <div>
          <h3 className="text-base font-semibold tracking-tight">Storefront</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Where your marketplace catalog appears publicly.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border p-4">
          <p className="text-sm font-medium">Beautora Marketplace shop</p>
          <p className="text-xs text-muted-foreground">
            Published products show on <code className="text-[11px]">/shop</code> after
            approval. Status: <Badge variant="outline">{seller.status}</Badge>
          </p>
        </div>
        {canToggleOrgStore ? (
          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-sm font-medium">Salon page storefront</p>
            <p className="text-xs text-muted-foreground">
              When enabled, marketplace products also appear on your public salon store page.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={orgPending}
              onClick={() => {
                startOrg(async () => {
                  const res = await setOrganizationMarketplaceStore(!orgStoreEnabled);
                  if (res.error) notify.error(res.error);
                  else
                    notify.success(
                      orgStoreEnabled ? "Storefront disabled" : "Storefront enabled"
                    );
                });
              }}
            >
              {orgStoreEnabled ? "Disable on salon page" : "Enable on salon page"}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Ask a salon owner or admin to toggle the salon-page marketplace storefront.
          </p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-1 py-4 backdrop-blur">
        <p className="text-xs text-muted-foreground">
          Enable at least one of COD or Card. Changes apply after save.
        </p>
        <Button type="submit" disabled={pending} className="min-w-36">
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
