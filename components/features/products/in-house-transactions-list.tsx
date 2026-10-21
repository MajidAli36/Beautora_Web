"use client";

import Link from "next/link";
import type { InHouseProductTxn } from "@/lib/actions/products";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";

function movementLabel(type: string, referenceType?: string | null) {
  const ref = String(referenceType ?? "");
  if (ref === "service_usage") return "POS auto-deduct";
  if (ref === "service_usage_amend") return "Amend deduct";
  if (ref === "service_usage_void") return "Restored — invoice deleted";
  if (ref === "service_usage_restore") return "Restored — full refund";
  if (ref === "service_usage_amend_reverse") return "Amend restore";
  if (ref === "manual" || !ref) {
    if (type === "IN") return "Stock in";
    if (type === "OUT") return "Stock out";
    return "Adjustment";
  }
  return type;
}

type InHouseTransactionsListProps = {
  transactions: InHouseProductTxn[];
  unitLabel: string;
  unitCost: number;
};

/** Paginated quantity history for an in-house product. */
export function InHouseTransactionsList({
  transactions,
  unitLabel,
  unitCost,
}: InHouseTransactionsListProps) {
  return (
    <PaginatedList
      items={transactions}
      empty={<p className="text-sm text-muted-foreground">No movements yet.</p>}
      search={{
        placeholder: "Search type, notes…",
        getText: (t) =>
          `${movementLabel(t.type, t.reference_type)} ${t.notes ?? ""} ${t.reference_id ?? ""}`,
      }}
    >
      {(slice) => (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Invoice / notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((t) => {
                const qty = Number(t.quantity) || 0;
                const signed = t.type === "OUT" ? -qty : t.type === "IN" ? qty : qty;
                const value = signed * unitCost;
                return (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(t.created_at)}
                    </TableCell>
                    <TableCell>{movementLabel(t.type, t.reference_type)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {signed > 0 ? "+" : ""}
                      {signed} {unitLabel}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(value)}
                    </TableCell>
                    <TableCell className="max-w-[16rem] text-muted-foreground">
                      {t.reference_id &&
                      String(t.reference_type ?? "").startsWith("service_usage") ? (
                        <span className="block truncate">
                          <Link
                            href={`/sales/${t.reference_id}`}
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            Open invoice
                          </Link>
                          {t.notes ? ` · ${t.notes}` : ""}
                        </span>
                      ) : (
                        <span className="block truncate">{t.notes ?? "—"}</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PaginatedList>
  );
}
