/**
 * Marketplace unit tests (pricing, cart, commission fallback, COD provider).
 * Run: npx tsx --test lib/marketplace/marketplace.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cartSubtotal,
  groupCartBySeller,
  type MarketplaceCartItem,
} from "./cart";
import { effectiveProductPrice, formatMarketplaceMoney } from "./pricing";
import { formatCommissionPercent, MARKETPLACE_COMMISSION_RATE } from "./constants";
import { CodPaymentProvider } from "./payments";

describe("effectiveProductPrice", () => {
  it("uses sale when lower than list", () => {
    assert.equal(effectiveProductPrice({ price: 1000, sale_price: 800 }), 800);
  });

  it("ignores sale when not lower", () => {
    assert.equal(effectiveProductPrice({ price: 1000, sale_price: 1200 }), 1000);
    assert.equal(effectiveProductPrice({ price: 1000, sale_price: null }), 1000);
  });
});

describe("formatMarketplaceMoney", () => {
  it("formats PKR-style", () => {
    assert.match(formatMarketplaceMoney(1500), /Rs/);
    assert.match(formatMarketplaceMoney(1500), /1,?500/);
  });
});

describe("cart helpers", () => {
  const items: MarketplaceCartItem[] = [
    {
      productId: "p1",
      title: "A",
      price: 100,
      quantity: 2,
      sellerId: "s1",
      sellerName: "Shop One",
      stock: 5,
    },
    {
      productId: "p2",
      title: "B",
      price: 50,
      quantity: 1,
      sellerId: "s2",
      sellerName: "Shop Two",
      stock: 3,
    },
    {
      productId: "p3",
      title: "C",
      price: 25,
      quantity: 4,
      sellerId: "s1",
      sellerName: "Shop One",
      stock: 10,
    },
  ];

  it("subtotal", () => {
    assert.equal(cartSubtotal(items), 100 * 2 + 50 + 25 * 4);
  });

  it("groups by seller", () => {
    const groups = groupCartBySeller(items);
    assert.equal(groups.length, 2);
    const s1 = groups.find((g) => g.sellerId === "s1");
    assert.ok(s1);
    assert.equal(s1!.items.length, 2);
    assert.equal(s1!.subtotal, 300);
  });
});

describe("commission constants", () => {
  it("launch default is 0", () => {
    assert.equal(MARKETPLACE_COMMISSION_RATE, 0);
    assert.equal(formatCommissionPercent(0), "0");
    assert.equal(formatCommissionPercent(0.1), "10");
  });
});

describe("CodPaymentProvider", () => {
  it("creates unpaid COD intent", async () => {
    const provider = new CodPaymentProvider();
    const intent = await provider.createPayment({
      orderId: "ord-1",
      amount: 500,
      idempotencyKey: "key-1",
    });
    assert.equal(intent.provider, "cod");
    assert.equal(intent.status, "created");
    assert.equal(intent.amount, 500);
    const confirmed = await provider.confirmPayment(intent.id);
    assert.equal(confirmed.status, "pending");
  });
});
