"use client";

import type { StatementLine } from "@/lib/actions/payments";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaginatedList } from "@/components/ui/table-pagination";

export function CustomerStatementLines({ lines }: { lines: StatementLine[] }) {
  return (
    <PaginatedList
      items={lines}
      empty={<p className="text-sm text-muted-foreground">No transactions in this range.</p>}
      search={{
        placeholder: "Search reference, description, date…",
        getText: (line) =>
          [line.reference, line.description, line.date, formatDateTime(line.date)].join(" "),
        emptyFiltered: (
          <p className="text-sm text-muted-foreground">No lines match your search.</p>
        ),
      }}
    >
      {(slice) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((line, i) => (
              <TableRow key={`${line.date}-${i}`}>
                <TableCell>{formatDateTime(line.date)}</TableCell>
                <TableCell>{line.reference}</TableCell>
                <TableCell>{line.description}</TableCell>
                <TableCell className="text-right">
                  {line.debit ? formatCurrency(line.debit) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {line.credit ? formatCurrency(line.credit) : "—"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(line.balance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PaginatedList>
  );
}
