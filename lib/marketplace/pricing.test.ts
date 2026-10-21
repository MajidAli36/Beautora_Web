import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyCommissionToInventoryKpis,
  calculateMarketplacePricing,
  effectiveProductPrice,
  isValidDiscountPrice,
  lineItemGrossProfit,
  normalizeDiscountPrice,
  platformCommissionOnAmount,
  sellerNetAfterCommission,
  summarizeMarketplaceInventory,
  validateMarketplacePricing,
} from "@/lib/marketplace/pricing";

describe("validateMarketplacePricing", () => {
  it("rejects zero and negative selling price for new products", () => {
    assert.equal(validateMarketplacePricing({ sellingPrice: 0 }).ok, false);
    assert.equal(validateMarketplacePricing({ sellingPrice: -1 }).ok, false);
  });

  it("rejects negative cost", () => {
    const r = validateMarketplacePricing({ costPrice: -1, sellingPrice: 100 });
    assert.equal(r.ok, false);
  });

  it("rejects discount greater than selling price", () => {
    const r = validateMarketplacePricing({
      sellingPrice: 100,
      discountPrice: 150,
    });
    assert.equal(r.ok, false);
  });

  it("rejects zero discount price when provided", () => {
    const r = validateMarketplacePricing({
      sellingPrice: 100,
      discountPrice: 0,
    });
    assert.equal(r.ok, false);
  });

  it("allows discount equal to selling (normalized to no discount)", () => {
    const r = validateMarketplacePricing({
      sellingPrice: 100,
      discountPrice: 100,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.discountPrice, null);
  });
});

describe("calculateMarketplacePricing — verification example", () => {
  it("matches PKR 700 / 1500 / 1200 expected results", () => {
    const c = calculateMarketplacePricing({
      costPrice: 700,
      sellingPrice: 1500,
      discountPrice: 1200,
      quantity: 10,
    });
    assert.equal(c.effectiveSellingPrice, 1200);
    assert.equal(c.discountAmount, 300);
    assert.equal(c.discountPercentage, 20);
    assert.equal(c.normalProfitPerUnit, 800);
    assert.equal(c.profitPerUnit, 500);
    assert.equal(c.profitMarginPercentage, 41.67);
    assert.equal(c.markupPercentage, 71.43);
    assert.equal(c.stockValueAtCost, 7000);
    assert.equal(c.stockValueAtSellingPrice, 12000);
    assert.equal(c.potentialGrossProfit, 5000);
  });

  it("no discount: effective equals selling; discount metrics zero", () => {
    const c = calculateMarketplacePricing({
      costPrice: 700,
      sellingPrice: 1500,
      discountPrice: null,
    });
    assert.equal(c.hasDiscount, false);
    assert.equal(c.effectiveSellingPrice, 1500);
    assert.equal(c.discountAmount, 0);
    assert.equal(c.discountPercentage, 0);
    assert.equal(c.profitPerUnit, 800);
    assert.equal(c.normalProfitPerUnit, 800);
  });

  it("discount equal to selling is not a discount", () => {
    assert.equal(isValidDiscountPrice(1500, 1500), false);
    assert.equal(normalizeDiscountPrice(1500, 1500), null);
    const c = calculateMarketplacePricing({
      costPrice: 700,
      sellingPrice: 1500,
      discountPrice: 1500,
    });
    assert.equal(c.hasDiscount, false);
    assert.equal(c.effectiveSellingPrice, 1500);
  });

  it("handles zero cost (markup 0, margin still computed)", () => {
    const c = calculateMarketplacePricing({
      costPrice: 0,
      sellingPrice: 100,
      discountPrice: 80,
    });
    assert.equal(c.markupPercentage, 0);
    assert.equal(c.profitPerUnit, 80);
    assert.equal(c.profitMarginPercentage, 100);
  });

  it("handles zero selling price without division errors", () => {
    const c = calculateMarketplacePricing({
      costPrice: 10,
      sellingPrice: 0,
      discountPrice: null,
    });
    assert.equal(c.discountPercentage, 0);
    assert.equal(c.profitMarginPercentage, 0);
  });
});

describe("effectiveProductPrice", () => {
  it("uses sale only when strictly less than list", () => {
    assert.equal(effectiveProductPrice({ price: 1500, sale_price: 1200 }), 1200);
    assert.equal(effectiveProductPrice({ price: 1500, sale_price: 1500 }), 1500);
    assert.equal(effectiveProductPrice({ price: 1500, sale_price: 1600 }), 1500);
    assert.equal(effectiveProductPrice({ price: 1500, sale_price: null }), 1500);
  });
});

describe("summarizeMarketplaceInventory", () => {
  it("aggregates cost and potential sales values", () => {
    const k = summarizeMarketplaceInventory([
      {
        price: 1500,
        sale_price: 1200,
        cost_price: 700,
        stock: 2,
        status: "published",
      },
      {
        price: 100,
        sale_price: null,
        cost_price: 40,
        stock: 5,
        status: "draft",
      },
    ]);
    assert.equal(k.totalProducts, 2);
    assert.equal(k.activeProducts, 1);
    assert.equal(k.productsOnSale, 1);
    assert.equal(k.totalUnitsInStock, 7);
    assert.equal(k.inventoryCostValue, 700 * 2 + 40 * 5);
    assert.equal(k.potentialSalesValue, 1200 * 2 + 100 * 5);
    assert.equal(k.averageDiscountPercentage, 20);
  });
});

describe("lineItemGrossProfit", () => {
  it("uses snapshot cost and charged unit price", () => {
    assert.equal(
      lineItemGrossProfit({
        unit_price: 1200,
        unit_cost: 700,
        quantity: 2,
      }),
      1000
    );
  });

  it("excludes cancelled lines", () => {
    assert.equal(
      lineItemGrossProfit({
        unit_price: 1200,
        unit_cost: 700,
        quantity: 2,
        fulfillment_status: "cancelled",
      }),
      0
    );
  });
});

describe("platform commission (seller keeps all when rate is 0)", () => {
  it("0% rate: no fee, full proceeds and profit to seller", () => {
    assert.equal(platformCommissionOnAmount(1200, 0), 0);
    const net = sellerNetAfterCommission({
      revenue: 1200,
      grossProfit: 500,
      commissionRate: 0,
    });
    assert.equal(net.commissionAmount, 0);
    assert.equal(net.sellerNetProceeds, 1200);
    assert.equal(net.sellerNetProfit, 500);
  });

  it("10% rate: fee on revenue, net profit = gross profit − fee", () => {
    assert.equal(platformCommissionOnAmount(1200, 0.1), 120);
    const net = sellerNetAfterCommission({
      revenue: 1200,
      grossProfit: 500,
      commissionRate: 0.1,
    });
    assert.equal(net.commissionAmount, 120);
    assert.equal(net.sellerNetProceeds, 1080);
    assert.equal(net.sellerNetProfit, 380);
  });

  it("inventory KPIs: 0% leaves potential values unchanged for seller", () => {
    const base = summarizeMarketplaceInventory([
      {
        price: 1500,
        sale_price: 1200,
        cost_price: 700,
        stock: 2,
        status: "published",
      },
    ]);
    const withZero = applyCommissionToInventoryKpis(base, 0);
    assert.equal(withZero.commissionAmount, 0);
    assert.equal(withZero.sellerNetProceeds, base.potentialSalesValue);
    assert.equal(withZero.sellerNetProfit, base.potentialGrossProfit);

    const withTen = applyCommissionToInventoryKpis(base, 0.1);
    assert.equal(withTen.commissionAmount, roundMoneyLike(base.potentialSalesValue * 0.1));
    assert.equal(
      withTen.sellerNetProfit,
      roundMoneyLike(base.potentialGrossProfit - withTen.commissionAmount)
    );
  });
});

function roundMoneyLike(n: number) {
  return Math.round(n * 100) / 100;
}
