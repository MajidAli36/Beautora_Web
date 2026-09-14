"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginatedList } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import type { DeletedRecordRow } from "@/lib/actions/audit";

export function DeletedRecordsPanel({ records }: { records: DeletedRecordRow[] }) {
  return (
    <PaginatedList
      items={records}
      empty={
        <p className="text-sm text-muted-foreground">No soft-deleted records yet.</p>
      }
      search={{
        placeholder: "Search type, record, deleted by…",
        getText: (row) =>
          [
            row.entityType,
            row.label,
            row.deleted_by_email ?? "",
            row.deleted_by_role ?? "",
          ].join(" "),
        emptyFiltered: (
          <p className="text-sm text-muted-foreground">No records match your search.</p>
        ),
      }}
    >
      {(slice) => (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Record</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead>By</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((row) => (
                <TableRow key={`${row.entityType}-${row.id}`}>
                  <TableCell>
                    <Badge variant="outline">{row.entityType}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate font-medium">
                    {row.label}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDateTime(row.deleted_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {row.deleted_by_email ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{row.deleted_by_role ?? "—"}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="ghost" disabled title="Coming soon">
                      Restore later
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PaginatedList>
  );
}
