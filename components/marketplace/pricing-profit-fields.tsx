"use client";

import { useMemo, useState } from "react";
import {
  calculateMarketplacePricing,
  sellerNetAfterCommission,
} from "@/lib/marketplace/pricing";
import { priceFieldLabel } from "@/lib/currency/labels";
import { formatCurrency } from "@/lib/format";
import { formatCommissionPercent } from "@/lib/marketplace/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type PricingProfitFieldsProps = {
  defaultCostPrice?: number | null;
  defaultSellingPrice?: number | null;
  defaultDiscountPrice?: number | null;
  /** Platform commission rate as decimal (0 = seller keeps 100%). */
  commissionRate?: number;
  className?: string;
};

function money(n: number) {
  return formatCurrency(n);
}

/**
 * Product Studio — Pricing & Profit section with live calculation preview.
 * Writes cost_price / price / sale_price (existing columns).
 */
export function PricingProfitFields({
  defaultCostPrice = 0,
  defaultSellingPrice = 0,
  defaultDiscountPrice = null,
  commissionRate = 0,
  className,
}: PricingProfitFieldsProps) {
  const [costPrice, setCostPrice] = useState(
    defaultCostPrice != null ? String(defaultCostPrice) : "0"
  );
  const [sellingPrice, setSellingPrice] = useState(
    defaultSellingPrice != null && Number(defaultSellingPrice) > 0
      ? String(defaultSellingPrice)
      : ""
  );
  const [discountPrice, setDiscountPrice] = useState(
    defaultDiscountPrice != null && Number(defaultDiscountPrice) > 0
      ? String(defaultDiscountPrice)
      : ""
  );

  const preview = useMemo(() => {
    const cost = costPrice.trim() === "" ? 0 : Number(costPrice);
    const selling = sellingPrice.trim() === "" ? 0 : Number(sellingPrice);
    const discount = discountPrice.trim() === "" ? null : Number(discountPrice);
    const calc = calculateMarketplacePricing({
      costPrice: Number.isFinite(cost) ? cost : 0,
      sellingPrice: Number.isFinite(selling) ? selling : 0,
      discountPrice:
        discount != null && Number.isFinite(discount) ? discount : null,
    });
    const net = sellerNetAfterCommission({
      revenue: calc.effectiveSellingPrice,
      grossProfit: calc.profitPerUnit,
      commissionRate,
    });
    return { ...calc, net };
  }, [costPrice, sellingPrice, discountPrice, commissionRate]);

  const commissionPct = formatCommissionPercent(commissionRate);
  const sellerKeepsAll = commissionRate <= 0;

  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Pricing & Profit</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Cost is private to your seller account. Shoppers only see the effective
          selling price (and a real discount when set).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cost_price">
            {priceFieldLabel("Manufacturing / Purchase Cost")}
          </Label>
          <Input
            id="cost_price"
            name="cost_price"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Never shown on the public shop.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">
            {priceFieldLabel("Actual Selling Price", true)}
          </Label>
          <Input
            id="price"
            name="price"
            type="number"
            min={0.01}
            step="0.01"
            required
            inputMode="decimal"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sale_price">
            {priceFieldLabel("Discounted Selling Price")} — Optional
          </Label>
          <Input
            id="sale_price"
            name="sale_price"
            type="number"
            min={0.01}
            step="0.01"
            inputMode="decimal"
            value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)}
            placeholder="Leave empty for no discount"
          />
        </div>
      </div>

      <div
        className="rounded-lg border border-border bg-muted/30 p-4"
        aria-live="polite"
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Live calculation
        </p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <PreviewRow
            label="Effective selling price"
            value={money(preview.effectiveSellingPrice)}
          />
          <PreviewRow
            label="Discount amount"
            value={money(preview.discountAmount)}
          />
          <PreviewRow
            label="Discount percentage"
            value={`${preview.discountPercentage}%`}
          />
          <PreviewRow
            label="Profit per unit (normal price)"
            value={money(preview.normalProfitPerUnit)}
          />
          <PreviewRow
            label="Profit per unit (effective)"
            value={money(preview.profitPerUnit)}
          />
          <PreviewRow
            label="Profit margin"
            value={`${preview.profitMarginPercentage}%`}
          />
          <PreviewRow
            label="Markup"
            value={`${preview.markupPercentage}%`}
          />
          <PreviewRow
            label={`Platform fee (${commissionPct}%)`}
            value={money(preview.net.commissionAmount)}
          />
          <PreviewRow
            label="Your net per unit (after fee)"
            value={money(preview.net.sellerNetProfit)}
            className="sm:col-span-2"
          />
        </dl>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {sellerKeepsAll
            ? "Platform commission is currently 0% — all sale proceeds go to your seller account. If Beautora enables a fee later (e.g. 10%), this preview will deduct it from revenue automatically."
            : `Platform takes ${commissionPct}% of the effective selling price on delivery. Gross profit above is before that fee; “Your net” is after it.`}
        </p>
        {!preview.hasDiscount && Number(sellingPrice) > 0 ? (
          <p className="mt-1 text-[11px] text-muted-foreground">
            No discount — public pages will not show a crossed-out price.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function PreviewRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0",
        className
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
