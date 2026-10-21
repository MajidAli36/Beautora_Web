"use client";

import { PaginatedList } from "@/components/ui/table-pagination";
import { formatCurrency } from "@/lib/format";

type LedgerRow = {
  id: string;
  entry_type: string;
  amount: number;
  notes: string | null;
};

/** Paginated seller ledger entries (marketplace payouts page). */
export function MarketplaceSellerLedgerList({ rows }: { rows: LedgerRow[] }) {
  return (
    <PaginatedList
      items={rows}
      empty={<p className="text-sm text-muted-foreground">No ledger entries yet.</p>}
      search={{
        placeholder: "Search type, notes…",
        getText: (row) => `${row.entry_type} ${row.notes ?? ""} ${row.amount}`,
      }}
    >
      {(slice) => (
        <ul className="divide-y text-sm">
          {slice.map((row) => (
            <li key={row.id} className="flex justify-between gap-3 py-2">
              <span>
                {row.entry_type}
                {row.notes ? ` · ${row.notes}` : ""}
              </span>
              <span className="font-medium">{formatCurrency(Number(row.amount))}</span>
            </li>
          ))}
        </ul>
      )}
    </PaginatedList>
  );
}
