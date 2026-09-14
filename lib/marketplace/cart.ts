export type MarketplaceCartItem = {
  productId: string;
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
