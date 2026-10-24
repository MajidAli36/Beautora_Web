"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignStaffDayOff,
  deleteAttendanceDay,
  type AttendanceDayRow,
} from "@/lib/actions/attendance-days";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/commerce";
import { getLocalDateString } from "@/lib/dates/local";
import { PaginatedList } from "@/components/ui/table-pagination";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { StaffPicker } from "@/components/features/attendance/staff-picker";

type StaffOption = { id: string; full_name: string };

const DAY_TYPES = [
  {
    value: "HOLIDAY",
    label: "Paid holiday",
    hint: "National or salon holiday — counts as present for attendance-adjusted pay",
  },
  {
    value: "ON_LEAVE",
    label: "Unpaid leave",
    hint: "Staff requested day off — does not count as present",
  },
  {
    value: "ABSENT",
    label: "Marked absent",
    hint: "No-show day override",
  },
  {
    value: "HALF_DAY",
    label: "Half day",
    hint: "Counts as 0.5 present day",
  },
] as const;

function statusLabel(status: string) {
  return DAY_TYPES.find((d) => d.value === status)?.label ?? status.replace(/_/g, " ");
}

/**
 * Assign one-off holidays / leave — same card/section language as Salary & duty.
 */
export function StaffHolidayForm({
  staffList,
  defaultStaffId,
  recentDays = [],
  className,
}: {
  staffList: StaffOption[];
  /** When set (staff profile page), default to this person and hide “all staff” less prominently. */
  defaultStaffId?: string;
  recentDays?: AttendanceDayRow[];
  className?: string;
}) {
  const router = useRouter();
  const [scope, setScope] = useState<"one" | "all">("one");
  const [dayType, setDayType] = useState<(typeof DAY_TYPES)[number]["value"]>("HOLIDAY");
  const [staffId, setStaffId] = useState(defaultStaffId ?? "");
  const [state, formAction, pending] = useActionState(
    assignStaffDayOff,
    {} as ActionResult
  );
  const [deleting, startDelete] = useTransition();
  useActionToast(state, {
    successMessage: "Holiday / leave saved.",
    onSuccess: () => {
      window.setTimeout(() => router.refresh(), 320);
    },
  });

  const today = getLocalDateString();
  const needsStaff = scope === "one";

  return (
    <div className={cn("space-y-8", className)}>
      <form action={formAction} className="space-y-6">
        <section className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Assign a day</h3>
            <p className="text-xs text-muted-foreground">
              One-off dates only. Recurring weekly offs stay on Salary & duty → Weekly
              off days.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="work_date">Date *</Label>
              <Input
                id="work_date"
                name="work_date"
                type="date"
                required
                defaultValue={today}
                className="h-9 max-w-xs bg-background"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Type *</Label>
              <input type="hidden" name="status" value={dayType} />
              <div className="grid gap-2 sm:grid-cols-2">
                {DAY_TYPES.map((t) => {
                  const active = dayType === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setDayType(t.value)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                          : "border-input bg-background hover:bg-muted/50"
                      )}
                    >
                      <span className="block text-sm font-medium">{t.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {t.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Who *</Label>
              <input type="hidden" name="scope" value={scope} />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setScope("one")}
                  aria-pressed={scope === "one"}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    scope === "one"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-input bg-background hover:bg-muted/50"
                  )}
                >
                  <span className="block text-sm font-medium">One staff member</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Assign leave / holiday to a single person
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScope("all");
                    setStaffId("");
                  }}
                  aria-pressed={scope === "all"}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left transition-colors",
                    scope === "all"
                      ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                      : "border-input bg-background hover:bg-muted/50"
                  )}
                >
                  <span className="block text-sm font-medium">All active staff</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    National / salon holiday for everyone
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="staff_id">Staff member{needsStaff ? " *" : ""}</Label>
              <StaffPicker
                id="staff_id"
                name="staff_id"
                staff={staffList}
                value={staffId}
                onValueChange={setStaffId}
                disabled={!needsStaff}
                required={needsStaff}
                placeholder="Search staff name…"
              />
              <p className="text-[11px] text-muted-foreground">
                {staffList.length === 0
                  ? "Add an active staff profile above, then return here."
                  : needsStaff
                    ? `Pick one person from the list (${staffList.length} active).`
                    : "Ignored for “All active staff”."}
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="e.g. Eid holiday · Staff request · Family emergency"
                className="bg-background"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              <strong className="font-medium text-foreground">Paid holiday</strong> —
              use for national days or salon closure. Payroll treats it as present (no
              cut under attendance-adjusted). Late fines are skipped.
            </p>
            <p>
              <strong className="font-medium text-foreground">Unpaid leave</strong> —
              when an employee asks for a day off. Under attendance-adjusted policy,
              that day reduces pay.
            </p>
          </div>
        </section>

        <Button
          type="submit"
          disabled={
            pending ||
            staffList.length === 0 ||
            (needsStaff && !staffId)
          }
        >
          {pending ? "Saving…" : "Save holiday / leave"}
        </Button>
      </form>

      {recentDays.length > 0 ? (
        <section className="space-y-3 border-t border-border pt-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Recent assignments</h3>
            <p className="text-xs text-muted-foreground">
              Remove a row if it was assigned by mistake.
            </p>
          </div>
          <PaginatedList
            items={recentDays}
            search={{
              placeholder: "Search date, staff, type…",
              getText: (d) =>
                `${d.work_date} ${d.staff_name ?? ""} ${statusLabel(d.status)} ${d.notes ?? ""}`,
            }}
          >
            {(slice) => (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {slice.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {d.work_date}
                        {d.staff_name ? ` · ${d.staff_name}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {statusLabel(d.status)}
                        {d.notes ? ` — ${d.notes}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={deleting}
                      aria-label="Remove assignment"
                      onClick={() => {
                        startDelete(async () => {
                          const res = await deleteAttendanceDay(d.id, d.staff_id);
                          if (res.error) {
                            notify.error(res.error);
                            return;
                          }
                          notify.success("Assignment removed.");
                          router.refresh();
                        });
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </PaginatedList>
        </section>
      ) : null}
    </div>
  );
}
