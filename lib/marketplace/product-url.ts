/**
 * SEO-friendly marketplace product URLs.
 * Canonical form: /product/{slug}-{shortId}
 * Legacy UUID URLs permanently redirect to the canonical path.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function productShortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toLowerCase();
}

export function marketplaceProductPath(product: {
  id: string;
  slug?: string | null;
}): string {
  const base =
    (product.slug ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "product";
  return `/product/${base}-${productShortId(product.id)}`;
}

export type ParsedProductParam =
  | { kind: "uuid"; id: string }
  | { kind: "slug-id"; slug: string; shortId: string }
  | { kind: "slug"; slug: string };

export function parseProductParam(param: string): ParsedProductParam {
  const raw = decodeURIComponent(param).trim();
  if (UUID_RE.test(raw)) return { kind: "uuid", id: raw.toLowerCase() };

  const withId = raw.match(/^(.*)-([0-9a-f]{8})$/i);
  if (withId?.[1] && withId[2]) {
    return {
      kind: "slug-id",
      slug: withId[1].toLowerCase(),
      shortId: withId[2].toLowerCase(),
    };
  }

  return { kind: "slug", slug: raw.toLowerCase() };
}

export function productMatchesShortId(productId: string, shortId: string) {
  return productShortId(productId) === shortId.toLowerCase();
}
