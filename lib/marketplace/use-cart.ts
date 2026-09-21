"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  MARKETPLACE_CART_KEY,
  cartSubtotal,
  groupCartBySeller,
  type MarketplaceCartItem,
} from "@/lib/marketplace/cart";

function readCart(): MarketplaceCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MARKETPLACE_CART_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MarketplaceCartItem[];
  } catch {
    return [];
  }
}

let listeners = new Set<() => void>();
let cached: MarketplaceCartItem[] = [];

function emit() {
  cached = readCart();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cached.length || readCart().length ? (cached.length ? cached : readCart()) : cached;
}

function getServerSnapshot(): MarketplaceCartItem[] {
  return [];
}

export function writeMarketplaceCart(next: MarketplaceCartItem[]) {
  try {
    localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  emit();
}

export function useMarketplaceCart() {
  const [hydrated, setHydrated] = useState(false);
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    cached = readCart();
    setHydrated(true);
    emit();
  }, []);

  const persist = useCallback((next: MarketplaceCartItem[]) => {
    writeMarketplaceCart(next);
  }, []);

  const setQty = useCallback(
    (item: MarketplaceCartItem, quantity: number) => {
      const key = `${item.productId}:${item.variantId ?? ""}`;
      const current = readCart();
      if (quantity < 1) {
        persist(current.filter((i) => `${i.productId}:${i.variantId ?? ""}` !== key));
        return;
      }
      persist(
        current.map((i) =>
          `${i.productId}:${i.variantId ?? ""}` === key
            ? { ...i, quantity: Math.min(quantity, i.stock) }
            : i
        )
      );
    },
    [persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  return {
    items: hydrated ? items : [],
    hydrated,
    count: items.reduce((s, i) => s + i.quantity, 0),
    subtotal: cartSubtotal(items),
    grouped: groupCartBySeller(items),
    persist,
    setQty,
    clear,
  };
}
