import type { ProductKind } from "@/types";

export const PRODUCT_KINDS = ["RETAIL", "IN_HOUSE", "BOTH"] as const;

export function isProductKind(value: string): value is ProductKind {
  return (PRODUCT_KINDS as readonly string[]).includes(value);
}

export function isSellableProductKind(kind: ProductKind | string | null | undefined): boolean {
  return kind === "RETAIL" || kind === "BOTH" || !kind;
}

export function isUsableInServiceKind(kind: ProductKind | string | null | undefined): boolean {
  return kind === "IN_HOUSE" || kind === "BOTH";
}

export function productKindLabel(kind: ProductKind | string | null | undefined): string {
  switch (kind) {
    case "IN_HOUSE":
      return "In-house";
    case "BOTH":
      return "Retail + In-house";
    case "RETAIL":
    default:
      return "Retail";
  }
}

export function roundQty(n: number): number {
  return Math.round((Number(n) || 0) * 1000) / 1000;
}
