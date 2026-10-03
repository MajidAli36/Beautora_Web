"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notify } from "@/lib/toast";
import {
  deletePlatformPendingUser,
  type PlatformUserRow,
  type PlatformUserStatus,
} from "@/lib/actions/platform-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginatedList } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusBadge(status: PlatformUserStatus) {
  if (status === "pending") return <Badge variant="warning">Pending</Badge>;
  if (status === "banned") return <Badge variant="destructive">Banned</Badge>;
  return <Badge variant="success">Active</Badge>;
}

function roleLabel(role: PlatformUserRow["role"]) {
  switch (role) {
    case "platform_admin":
      return "Platform admin";
    case "owner":
      return "Salon owner";
    case "customer":
      return "Shopper";
    case "partner":
      return "Partner";
    case "staff":
      return "Staff";
    default:
      return "Unknown";
  }
}

export function PlatformUsersPanel({
  users,
  previewLimit,
  enableSearch = false,
  viewAllHref,
}: {
  users: PlatformUserRow[];
  previewLimit?: number;
  enableSearch?: boolean;
  viewAllHref?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | PlatformUserStatus>(
    users.some((u) => u.status === "pending") ? "pending" : "all"
  );
  const [busy, setBusy] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: users.length,
      pending: users.filter((u) => u.status === "pending").length,
      active: users.filter((u) => u.status === "active").length,
      banned: users.filter((u) => u.status === "banned").length,
    }),
    [users]
  );

  const filtered = useMemo(
    () => (filter === "all" ? users : users.filter((u) => u.status === filter)),
    [users, filter]
  );

  const visible =
    previewLimit != null && !enableSearch
      ? filtered.slice(0, previewLimit)
      : filtered;
  const isPreview =
    !enableSearch && previewLimit != null && filtered.length > previewLimit;

  async function removePending(user: PlatformUserRow) {
    if (user.status !== "pending") return;
    const ok = window.confirm(
      `Delete pending user ${user.email}? They can sign up again with a fresh verification email.`
    );
    if (!ok) return;
    setBusy(user.id);
    const result = await deletePlatformPendingUser(user.id);
    setBusy(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Pending user deleted");
    router.refresh();
  }

  function UserRow({ u }: { u: PlatformUserRow }) {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{u.displayName || u.email}</p>
            {statusBadge(u.status)}
            <Badge variant="secondary">{roleLabel(u.role)}</Badge>
            {u.partnerStatus === "pending" ? (
              <Badge variant="warning">Partner pending</Badge>
            ) : null}
            {u.partnerStatus === "approved" ? (
              <Badge variant="success">Partner approved</Badge>
            ) : null}
            {u.partnerStatus === "rejected" ? (
              <Badge variant="destructive">Partner rejected</Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {u.email}
            {u.organizationName ? ` · ${u.organizationName}` : ""}
            {" · "}joined {formatDate(u.createdAt)}
            {" · "}last sign-in {formatDate(u.lastSignInAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            Email{" "}
            {u.emailConfirmedAt
              ? `verified ${formatDate(u.emailConfirmedAt)}`
              : "not verified yet"}
          </p>
        </div>
        {u.status === "pending" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy === u.id}
            onClick={() => removePending(u)}
          >
            {busy === u.id ? "Deleting…" : "Delete pending"}
          </Button>
        ) : null}
      </li>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            All auth accounts — status Pending / Active / Banned plus role.
          </p>
        </div>
        {viewAllHref ? (
          <Button variant="outline" size="sm" render={<Link href={viewAllHref} />}>
            View all users ({users.length})
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", `All (${counts.all})`],
            ["pending", `Pending (${counts.pending})`],
            ["active", `Active (${counts.active})`],
            ["banned", `Banned (${counts.banned})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {enableSearch ? (
        <PaginatedList
          items={filtered}
          pageSize={10}
          empty={
            <li className="list-none p-4 text-sm text-muted-foreground">
              No users match this filter.
            </li>
          }
          search={{
            placeholder: "Search email, name, salon, role, status…",
            getText: (u) =>
              [
                u.email,
                u.displayName ?? "",
                u.organizationName ?? "",
                roleLabel(u.role),
                u.status,
                u.partnerStatus ?? "",
              ].join(" "),
          }}
        >
          {(slice) => (
            <ul className="divide-y rounded-lg border">
              {slice.map((u) => (
                <UserRow key={u.id} u={u} />
              ))}
            </ul>
          )}
        </PaginatedList>
      ) : (
        <>
          <ul className="divide-y rounded-lg border">
            {visible.length === 0 ? (
              <li className="p-4 text-sm text-muted-foreground">
                No users match this filter.
              </li>
            ) : (
              visible.map((u) => <UserRow key={u.id} u={u} />)
            )}
          </ul>
          {isPreview && viewAllHref ? (
            <p className="text-xs text-muted-foreground">
              Showing {visible.length} of {filtered.length}.{" "}
              <Link
                href={viewAllHref}
                className="font-medium underline-offset-4 hover:underline"
              >
                Open full users list
              </Link>
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
