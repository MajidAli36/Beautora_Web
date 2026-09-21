"use client";

import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  marketplaceCategoryChildren,
  marketplaceCategoryParents,
  type MarketplaceCategory,
} from "@/lib/marketplace/category-tree";

export function MarketplaceCategoryPicker({
  categories,
  name = "category_id",
  defaultCategoryId = "",
  required = false,
}: {
  categories: MarketplaceCategory[];
  name?: string;
  defaultCategoryId?: string;
  required?: boolean;
}) {
  const parents = useMemo(
    () => marketplaceCategoryParents(categories),
    [categories]
  );

  const initial = useMemo(() => {
    if (!defaultCategoryId) return { parentId: "", childId: "" };
    const selected = categories.find((c) => c.id === defaultCategoryId);
    if (!selected) return { parentId: "", childId: "" };
    if (selected.parent_id) {
      return { parentId: selected.parent_id, childId: selected.id };
    }
    return { parentId: selected.id, childId: "" };
  }, [categories, defaultCategoryId]);

  const [parentId, setParentId] = useState(initial.parentId);
  const [childId, setChildId] = useState(initial.childId);

  const children = useMemo(
    () => (parentId ? marketplaceCategoryChildren(categories, parentId) : []),
    [categories, parentId]
  );

  const value = childId || parentId || "";

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:col-span-2 lg:col-span-2">
      <div className="space-y-2">
        <Label htmlFor={`${name}-parent`}>Category</Label>
        <select
          id={`${name}-parent`}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={parentId}
          required={required}
          onChange={(e) => {
            setParentId(e.target.value);
            setChildId("");
          }}
        >
          <option value="">Uncategorized</option>
          {parents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${name}-child`}>Subcategory</Label>
        <select
          id={`${name}-child`}
          className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-50"
          value={childId}
          disabled={!parentId || children.length === 0}
          onChange={(e) => setChildId(e.target.value)}
        >
          <option value="">
            {!parentId
              ? "Select a category first"
              : children.length === 0
                ? "No subcategories"
                : "All / parent only"}
          </option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
