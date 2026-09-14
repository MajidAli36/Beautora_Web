"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const DEFAULT_PAGE_SIZE = 10;

type TablePaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  if (total <= pageSize) {
    return (
      <p className={`px-1 pt-3 text-xs text-muted-foreground ${className ?? ""}`}>
        Showing {total} {total === 1 ? "record" : "records"}
      </p>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-t px-1 pt-3 ${className ?? ""}`}
    >
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          <ChevronLeft className="size-3.5" />
          Prev
        </Button>
        <span className="min-w-[4.5rem] text-center text-xs font-medium tabular-nums">
          Page {safePage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    slice: items.slice(start, start + pageSize),
  };
}

/** Client hook — resets to page 1 when the list length changes. */
export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [pageState, setPageState] = useState({ length: items.length, page: 1 });

  if (pageState.length !== items.length) {
    setPageState({ length: items.length, page: 1 });
  }

  const { page: safePage, slice, totalPages } = paginateItems(items, pageState.page, pageSize);

  return {
    page: safePage,
    setPage: (page: number) => setPageState((current) => ({ ...current, page })),
    slice,
    total: items.length,
    pageSize,
    totalPages,
  };
}

export type PaginatedListSearch<T> = {
  /** Build a searchable string for each row. */
  getText: (item: T) => string;
  placeholder?: string;
  label?: string;
  /** Shown when the source list has rows but none match the query. */
  emptyFiltered?: React.ReactNode;
};

type PaginatedListProps<T> = {
  items: T[];
  pageSize?: number;
  className?: string;
  empty?: React.ReactNode;
  /** When set, shows a search box and filters items client-side. */
  search?: PaginatedListSearch<T>;
  children: (slice: T[]) => React.ReactNode;
};

function matchesSearch(haystack: string, term: string) {
  return haystack.toLowerCase().includes(term);
}

/** Wraps any list/table body with optional search + Prev/Next pagination (default 10). */
export function PaginatedList<T>({
  items,
  pageSize = DEFAULT_PAGE_SIZE,
  className,
  empty,
  search,
  children,
}: PaginatedListProps<T>) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!search || !term) return items;
    return items.filter((item) => matchesSearch(search.getText(item), term));
  }, [items, search, term]);

  const { page, setPage, slice, total } = usePagination(filtered, pageSize);

  const searchBox = search ? (
    <Input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={search.placeholder ?? "Search…"}
      className="max-w-sm"
      aria-label={search.label ?? search.placeholder ?? "Search list"}
    />
  ) : null;

  if (items.length === 0) {
    return (
      <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
        {searchBox}
        {empty ?? null}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
        {searchBox}
        {search?.emptyFiltered ?? (
          <p className="text-sm text-muted-foreground">No results match your search.</p>
        )}
      </div>
    );
  }

  return (
    <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
      {searchBox}
      {children(slice)}
      <TablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
}
