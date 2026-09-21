export type MarketplaceCartItem = {
  productId: string;
  variantId?: string | null;
  variantName?: string | null;
  title: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  sellerId: string;
  sellerName?: string;
  stock: number;
};

export const MARKETPLACE_CART_KEY = "beautora_marketplace_cart_v1";

export function cartSubtotal(items: MarketplaceCartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function groupCartBySeller(items: MarketplaceCartItem[]) {
  const map = new Map<
    string,
    { sellerId: string; sellerName?: string; items: MarketplaceCartItem[]; subtotal: number }
  >();
  for (const item of items) {
    const cur = map.get(item.sellerId) ?? {
      sellerId: item.sellerId,
      sellerName: item.sellerName,
      items: [],
      subtotal: 0,
    };
    cur.items.push(item);
    cur.subtotal += item.price * item.quantity;
    if (!cur.sellerName && item.sellerName) cur.sellerName = item.sellerName;
    map.set(item.sellerId, cur);
  }
  return Array.from(map.values());
}
