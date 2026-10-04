"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ShieldCheck, Trash2 } from "lucide-react";
import { notify } from "@/lib/toast";
import {
  confirmPlatformUserEmail,
  deletePlatformPendingUser,
  sendPlatformUserNote,
  type PlatformUserRow,
  type PlatformUserRole,
  type PlatformUserStatus,
} from "@/lib/actions/platform-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaginatedList } from "@/components/ui/table-pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
}

const ROLE_FILTERS: Array<{ key: "all" | PlatformUserRole; label: string }> = [
  { key: "all", label: "All roles" },
  { key: "owner", label: "Salon owners" },
  { key: "staff", label: "Staff" },
  { key: "customer", label: "Shoppers" },
  { key: "partner", label: "Partners" },
  { key: "platform_admin", label: "Platform admin" },
  { key: "unknown", label: "Unknown" },
];

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
  const [statusFilter, setStatusFilter] = useState<"all" | PlatformUserStatus>(
    users.some((u) => u.status === "pending") ? "pending" : "all"
  );
  const [roleFilter, setRoleFilter] = useState<"all" | PlatformUserRole>("all");
  const [storeFilter, setStoreFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [noteUser, setNoteUser] = useState<PlatformUserRow | null>(null);
  const [noteSubject, setNoteSubject] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [sendingNote, setSendingNote] = useState(false);

  const stores = useMemo(
    () => uniqueSorted(users.map((u) => u.organizationName)),
    [users]
  );
  const cities = useMemo(() => uniqueSorted(users.map((u) => u.city)), [users]);
  const countries = useMemo(
    () => uniqueSorted(users.map((u) => u.country)),
    [users]
  );

  const counts = useMemo(
    () => ({
      all: users.length,
      pending: users.filter((u) => u.status === "pending").length,
      active: users.filter((u) => u.status === "active").length,
      banned: users.filter((u) => u.status === "banned").length,
      owners: users.filter((u) => u.role === "owner").length,
      staff: users.filter((u) => u.role === "staff").length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (
        storeFilter !== "all" &&
        (u.organizationName ?? "").trim() !== storeFilter
      ) {
        return false;
      }
      if (cityFilter !== "all" && (u.city ?? "").trim() !== cityFilter) {
        return false;
      }
      if (
        countryFilter !== "all" &&
        (u.country ?? "").trim() !== countryFilter
      ) {
        return false;
      }
      return true;
    });
  }, [users, statusFilter, roleFilter, storeFilter, cityFilter, countryFilter]);

  const visible =
    previewLimit != null && !enableSearch
      ? filtered.slice(0, previewLimit)
      : filtered;
  const isPreview =
    !enableSearch && previewLimit != null && filtered.length > previewLimit;

  function openNote(user: PlatformUserRow) {
    setNoteUser(user);
    setNoteSubject(
      user.organizationName
        ? `Note for ${user.organizationName}`
        : "A note from Beautora"
    );
    setNoteBody("");
  }

  async function submitNote() {
    if (!noteUser) return;
    setSendingNote(true);
    const result = await sendPlatformUserNote({
      userId: noteUser.id,
      subject: noteSubject,
      note: noteBody,
    });
    setSendingNote(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(`Note emailed to ${noteUser.email}`);
    setNoteUser(null);
  }

  async function verifyEmail(user: PlatformUserRow) {
    setBusy(`verify:${user.id}`);
    const result = await confirmPlatformUserEmail(user.id);
    setBusy(null);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success(`Verified ${user.email}`);
    router.refresh();
  }

  async function removePending(user: PlatformUserRow) {
    if (user.status !== "pending") return;
    const ok = window.confirm(
      `Delete pending user ${user.email}? They can sign up again with a fresh account.`
    );
    if (!ok) return;
    setBusy(`delete:${user.id}`);
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
      <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{u.displayName || u.email}</p>
            {statusBadge(u.status)}
            <Badge variant="secondary">{roleLabel(u.role)}</Badge>
            {u.memberRole ? (
              <Badge variant="outline">Member: {u.memberRole}</Badge>
            ) : null}
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
            {u.city ? ` · ${u.city}` : ""}
            {u.country ? ` · ${u.country}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Joined {formatDate(u.createdAt)} · last sign-in{" "}
            {formatDate(u.lastSignInAt)} · email{" "}
            {u.emailConfirmedAt
              ? `verified ${formatDate(u.emailConfirmedAt)}`
              : "not verified yet"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => openNote(u)}>
            <Mail className="size-3.5" />
            Send note
          </Button>
          {!u.emailConfirmedAt ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === `verify:${u.id}`}
              onClick={() => verifyEmail(u)}
            >
              <ShieldCheck className="size-3.5" />
              {busy === `verify:${u.id}` ? "Verifying…" : "Verify email"}
            </Button>
          ) : null}
          {u.status === "pending" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy === `delete:${u.id}`}
              onClick={() => removePending(u)}
            >
              <Trash2 className="size-3.5" />
              {busy === `delete:${u.id}` ? "Deleting…" : "Delete pending"}
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Users</h2>
          <p className="text-sm text-muted-foreground">
            Filter by status, role, store, city, and country. Email personal
            notes anytime.
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
            onClick={() => setStatusFilter(key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground/40"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {enableSearch ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Role</span>
            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as "all" | PlatformUserRole)
              }
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ROLE_FILTERS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                  {opt.key === "owner"
                    ? ` (${counts.owners})`
                    : opt.key === "staff"
                      ? ` (${counts.staff})`
                      : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Store</span>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All stores</option>
              {stores.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">City</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 text-xs">
            <span className="font-medium text-muted-foreground">Country</span>
            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {enableSearch ? (
        <PaginatedList
          items={filtered}
          pageSize={10}
          empty={
            <li className="list-none p-4 text-sm text-muted-foreground">
              No users match these filters.
            </li>
          }
          search={{
            placeholder:
              "Search email, name, salon, city, country, role, status…",
            getText: (u) =>
              [
                u.email,
                u.displayName ?? "",
                u.organizationName ?? "",
                u.city ?? "",
                u.country ?? "",
                u.memberRole ?? "",
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

      <Dialog
        open={Boolean(noteUser)}
        onOpenChange={(open) => {
          if (!open) setNoteUser(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Send personal note</DialogTitle>
            <DialogDescription>
              Emails {noteUser?.email}
              {noteUser?.displayName ? ` (${noteUser.displayName})` : ""}.
              They can reply to your support inbox.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="admin-note-subject">Subject</Label>
              <Input
                id="admin-note-subject"
                value={noteSubject}
                onChange={(e) => setNoteSubject(e.target.value)}
                placeholder="Subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-note-body">Note</Label>
              <Textarea
                id="admin-note-body"
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Write a personal note…"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteUser(null)}
              disabled={sendingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={submitNote}
              disabled={
                sendingNote ||
                noteSubject.trim().length < 2 ||
                noteBody.trim().length < 2
              }
            >
              {sendingNote ? "Sending…" : "Send email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
