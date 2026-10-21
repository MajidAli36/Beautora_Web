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
import { sellerAvailableAfterDelivery } from "./ledger";
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
  it("formats with country currency symbols", () => {
    const pkr = formatMarketplaceMoney(1500, "PKR");
    assert.match(pkr, /Rs/);
    assert.match(pkr, /1,?500/);

    const inr = formatMarketplaceMoney(1500, "INR");
    assert.match(inr, /₹/);

    const usd = formatMarketplaceMoney(15, "USD");
    assert.match(usd, /\$/);
    assert.match(usd, /15/);

    const aed = formatMarketplaceMoney(1500, "AED");
    assert.match(aed, /AED/);
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

describe("delivery ledger available balance", () => {
  it("credits gross then debits commission once (not net-then-debit)", () => {
    assert.equal(sellerAvailableAfterDelivery(1000, 100), 900);
    assert.equal(sellerAvailableAfterDelivery(1000, 0), 1000);
    // Regression: old bug was credit(900) + debit(100) → available 800
    assert.notEqual(sellerAvailableAfterDelivery(1000, 100), 800);
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
