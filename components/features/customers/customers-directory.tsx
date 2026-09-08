"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import type { CustomerDirectoryRow } from "@/lib/actions/customers";
import { deleteCustomerInline } from "@/lib/actions/customers";
import {
  formatCurrency,
  formatCustomerName,
  formatRelativeTime,
} from "@/lib/format";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CustomerAvatar, CustomerTagPills } from "@/components/features/customers/customer-tags";
import { CustomerFormSheet } from "@/components/features/customers/customer-form-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

type FilterKey = "all" | "new" | "returning" | "vip";
type SortKey = "name" | "recent" | "spend";
type SortDir = "asc" | "desc";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "returning", label: "Returning" },
  { key: "vip", label: "VIP" },
];

const PAGE_SIZES = [10, 25, 50];

function matchesFilter(c: CustomerDirectoryRow, filter: FilterKey) {
  const tags = (c.tags ?? []).map((t) => t.toLowerCase());
  const created = new Date(c.created_at);
  const days30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  if (filter === "vip") return tags.some((t) => t === "vip");
  if (filter === "new")
    return tags.some((t) => t === "new") || created.getTime() >= days30;
  if (filter === "returning") return c.visitCount > 1;
  return true;
}

function sortCustomers(rows: CustomerDirectoryRow[], sort: SortKey, dir: SortDir) {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sort === "spend") return (a.totalSpent - b.totalSpent) * mul;
    if (sort === "recent")
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mul;
    const an = formatCustomerName(a.first_name, a.last_name).toLowerCase();
    const bn = formatCustomerName(b.first_name, b.last_name).toLowerCase();
    return an.localeCompare(bn) * mul;
  });
}

type CustomersDirectoryProps = {
  customers: CustomerDirectoryRow[];
  newThisMonth: number;
  canEdit: boolean;
  canDelete: boolean;
  initialQuery?: string;
};

export function CustomersDirectory({
  customers,
  newThisMonth,
  canEdit,
  canDelete,
  initialQuery = "",
}: CustomersDirectoryProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [pageSize, setPageSize] = useState(10);
  const [sheet, setSheet] = useState<{
    open: boolean;
    mode: "add" | "edit";
    customer?: CustomerDirectoryRow | null;
  }>({ open: false, mode: "add" });
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = customers.filter((c) => matchesFilter(c, filter));
    if (q) {
      rows = rows.filter((c) => {
        const name = formatCustomerName(c.first_name, c.last_name).toLowerCase();
        return (
          name.includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    return sortCustomers(rows, sort, sortDir);
  }, [customers, filter, query, sort, sortDir]);

  const { page, setPage, slice } = usePagination(filtered, pageSize);

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
    setPage(1);
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sort !== column) return <ArrowUpDown className="size-3.5 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="size-3.5 text-primary" />
    ) : (
      <ArrowDown className="size-3.5 text-primary" />
    );
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      notify.success("Email copied");
    } catch {
      notify.error("Could not copy email");
    }
  }

  const hasAnyCustomers = customers.length > 0;
  const emptyFiltered = hasAnyCustomers && filtered.length === 0;

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Customers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your salon&apos;s customer records.
          </p>
        </div>
        {canEdit ? (
          <Button
            className="h-11 w-full touch-target sm:h-9 sm:w-auto"
            onClick={() => setSheet({ open: true, mode: "add" })}
          >
            <Plus className="size-4" />
            Add customer
          </Button>
        ) : null}
      </div>

      {/* Toolbar */}
      <div className="dashboard-card space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, phone, email…"
              className="h-11 pl-9"
              aria-label="Search customers"
            />
          </div>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 lg:overflow-visible">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => {
                  setFilter(f.key);
                  setPage(1);
                }}
                className={cn(
                  "h-10 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors duration-150",
                  filter === f.key
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="customer-sort">
            Sort customers
          </label>
          <select
            id="customer-sort"
            value={`${sort}:${sortDir}`}
            onChange={(e) => {
              const [s, d] = e.target.value.split(":") as [SortKey, SortDir];
              setSort(s);
              setSortDir(d);
              setPage(1);
            }}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm lg:ml-auto lg:w-auto lg:min-w-[11rem]"
          >
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="recent:desc">Recently added</option>
            <option value="spend:desc">Highest spend</option>
            <option value="spend:asc">Lowest spend</option>
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} customer{filtered.length === 1 ? "" : "s"}
          {hasAnyCustomers ? ` · ${newThisMonth} new this month` : null}
          {filter !== "all" ? ` · filter: ${filter}` : null}
          {query.trim() ? ` · “${query.trim()}”` : null}
        </p>
      </div>

      {/* Empty: no customers at all */}
      {!hasAnyCustomers ? (
        <div className="dashboard-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No customers yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Add your first customer to start building your salon&apos;s client base.
          </p>
          {canEdit ? (
            <Button className="mt-5 h-11" onClick={() => setSheet({ open: true, mode: "add" })}>
              <Plus className="size-4" />
              Add customer
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Empty: filtered */}
      {emptyFiltered ? (
        <div className="dashboard-card flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
            <Search className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No matches found</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try adjusting your search or filters to find the customer you&apos;re looking for.
          </p>
          <Button
            variant="outline"
            className="mt-5 h-11"
            onClick={() => {
              setQuery("");
              setFilter("all");
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : null}

      {/* Desktop / tablet table */}
      {filtered.length > 0 ? (
        <div className="dashboard-card hidden min-w-0 overflow-hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-semibold"
                      onClick={() => toggleSort("name")}
                    >
                      Name
                      <SortIcon column="name" />
                    </button>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-semibold"
                      onClick={() => toggleSort("spend")}
                    >
                      Total spend
                      <SortIcon column="spend" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.map((customer) => {
                  const name = formatCustomerName(customer.first_name, customer.last_name);
                  return (
                    <TableRow
                      key={customer.id}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-muted/40"
                      tabIndex={0}
                      onClick={() => router.push(`/customers/${customer.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") router.push(`/customers/${customer.id}`);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <CustomerAvatar name={name} size="sm" />
                          <Link
                            href={`/customers/${customer.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {name}
                          </Link>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.phone ? (
                          <a
                            href={`tel:${customer.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm hover:text-primary"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Call ${name}`}
                          >
                            <Phone className="size-3.5 text-muted-foreground" />
                            {customer.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.email ? (
                          <button
                            type="button"
                            className="group/email inline-flex max-w-[14rem] items-center gap-1.5 truncate text-left text-sm hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyEmail(customer.email!);
                            }}
                            aria-label={`Copy email for ${name}`}
                          >
                            <span className="truncate">{customer.email}</span>
                            <Copy className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/email:opacity-100" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <CustomerTagPills tags={customer.tags} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(customer.lastVisitAt)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-9"
                            aria-label={`View ${name}`}
                            render={<Link href={`/customers/${customer.id}`} />}
                          >
                            <Eye className="size-4" />
                          </Button>
                          {canEdit ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="size-9"
                              aria-label={`Edit ${name}`}
                              onClick={() =>
                                setSheet({ open: true, mode: "edit", customer })
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <ConfirmAction
                              title="Delete customer?"
                              description={`Are you sure you want to delete ${name}? This cannot be undone.`}
                              confirmLabel="Delete"
                              pendingLabel="Deleting…"
                              variant="ghost"
                              size="icon-sm"
                              className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onConfirm={async () => {
                                const res = await deleteCustomerInline(customer.id);
                                if (!res.error) router.refresh();
                                return res;
                              }}
                              successMessage="Customer deleted."
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete {name}</span>
                            </ConfirmAction>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 rounded-md border border-border bg-background px-2"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              className="border-0 pt-0"
            />
          </div>
        </div>
      ) : null}

      {/* Mobile cards */}
      {filtered.length > 0 ? (
        <div className="space-y-3 md:hidden">
          {slice.map((customer) => {
            const name = formatCustomerName(customer.first_name, customer.last_name);
            return (
              <div
                key={customer.id}
                className="dashboard-card w-full p-4"
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/customers/${customer.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/customers/${customer.id}`);
                }}
              >
                <div className="flex items-start gap-3">
                  <CustomerAvatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{name}</p>
                        <div className="mt-1">
                          <CustomerTagPills tags={customer.tags} emptyLabel="" />
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                          aria-label={`Actions for ${name}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="size-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/customers/${customer.id}`)}
                          >
                            <Eye className="size-4" />
                            View
                          </DropdownMenuItem>
                          {canEdit ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setSheet({ open: true, mode: "edit", customer })
                              }
                            >
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                          ) : null}
                          {canDelete ? (
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                startTransition(async () => {
                                  const ok = window.confirm(
                                    `Are you sure you want to delete ${name}? This cannot be undone.`
                                  );
                                  if (!ok) return;
                                  const res = await deleteCustomerInline(customer.id);
                                  if (res?.error) notify.error(res.error);
                                  else {
                                    notify.success("Customer deleted.");
                                    router.refresh();
                                  }
                                });
                              }}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="flex min-h-10 items-center gap-2 hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="size-3.5" />
                          {customer.phone}
                        </a>
                      ) : null}
                      {customer.email ? (
                        <p className="flex items-center gap-2 truncate">
                          <UserRound className="size-3.5 shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Last visit</p>
                        <p className="mt-0.5 font-medium text-foreground">
                          {formatRelativeTime(customer.lastVisitAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted-foreground">Total spend</p>
                        <p className="mt-0.5 font-semibold text-foreground">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-10 rounded-lg border border-border bg-background px-2 text-sm"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              className="border-0 pt-0"
            />
          </div>
        </div>
      ) : null}

      {/* Mobile FAB — add customer (complements header CTA) */}
      {canEdit ? (
        <Button
          size="icon-lg"
          className="fixed z-40 size-14 rounded-full shadow-lg md:hidden"
          style={{
            bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
            right: "calc(1rem + env(safe-area-inset-right, 0px))",
          }}
          aria-label="Add customer"
          onClick={() => setSheet({ open: true, mode: "add" })}
        >
          <Plus className="size-5" />
        </Button>
      ) : null}

      <CustomerFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        mode={sheet.mode}
        customer={sheet.customer}
      />
    </div>
  );
}
