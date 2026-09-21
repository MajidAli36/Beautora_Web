import type { Database } from "@/types/database.types";

export type MarketplaceCategory =
  Database["public"]["Tables"]["marketplace_categories"]["Row"];

export function marketplaceCategoryParents(categories: MarketplaceCategory[]) {
  return categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

export function marketplaceCategoryChildren(
  categories: MarketplaceCategory[],
  parentId: string
) {
  return categories
    .filter((c) => c.parent_id === parentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
}

/** IDs that match a filter slug: the category itself plus all children if it is a parent. */
export function marketplaceCategoryMatchIds(
  categories: MarketplaceCategory[],
  slug: string | null
): Set<string> | null {
  if (!slug) return null;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return new Set();
  const ids = new Set<string>([cat.id]);
  for (const child of categories) {
    if (child.parent_id === cat.id) ids.add(child.id);
  }
  return ids;
}

export function marketplaceCategoryLabel(
  categories: MarketplaceCategory[],
  categoryId: string | null | undefined
): string | null {
  if (!categoryId) return null;
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return null;
  if (!cat.parent_id) return cat.name;
  const parent = categories.find((c) => c.id === cat.parent_id);
  return parent ? `${parent.name} · ${cat.name}` : cat.name;
}
