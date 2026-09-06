"use client";

import { useActionState, useEffect, useState } from "react";
import { saveWeeklyStaffSchedule } from "@/lib/actions/scheduling";
import { useActionToast } from "@/hooks/use-action-toast";
import { DAY_NAMES } from "@/lib/booking/constants";
import { businessHoursForDay, isStaffDayOff } from "@/lib/booking/availability";
import type { ActionResult } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StaffScheduleEntry = {
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type DayDraft = {
  closed: boolean;
  start: string;
  end: string;
};

type StaffScheduleFormProps = {
  staff: { id: string; full_name: string }[];
  schedules?: StaffScheduleEntry[];
  title?: string;
  description?: string;
};

function timeForInput(value: string): string {
  return value.slice(0, 5);
}

function buildWeekDraft(staffId: string, schedules: StaffScheduleEntry[]): DayDraft[] {
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    const existing = schedules.find(
      (row) => row.staff_id === staffId && row.day_of_week === dayOfWeek
    );
    if (existing) {
      const start = timeForInput(existing.start_time);
      const end = timeForInput(existing.end_time);
      if (isStaffDayOff(start, end)) {
        return { closed: true, start: "09:00", end: "18:00" };
      }
      return { closed: false, start, end };
    }
    const fallback = businessHoursForDay(null, dayOfWeek);
    return {
      closed: fallback.closed,
      start: fallback.open,
      end: fallback.close,
    };
  });
}

export function StaffScheduleForm({
  staff,
  schedules = [],
  title = "Working hours & bookable slots",
  description = "Set weekly hours per staff member. These hours create the Available time list for reception and online booking.",
}: StaffScheduleFormProps) {
  const [state, formAction, pending] = useActionState(saveWeeklyStaffSchedule, {} as ActionResult);
  useActionToast(state, { successMessage: "Weekly hours saved." });
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [days, setDays] = useState<DayDraft[]>(() => buildWeekDraft(staff[0]?.id ?? "", schedules));

  useEffect(() => {
    setDays(buildWeekDraft(staffId, schedules));
  }, [staffId, schedules]);

  function patchDay(dayOfWeek: number, next: Partial<DayDraft>) {
    setDays((prev) => prev.map((d, i) => (i === dayOfWeek ? { ...d, ...next } : d)));
  }

  if (!staff.length) {
    return (
      <Card id="working-hours">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Add staff members first, then set their weekly hours.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card id="working-hours">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="max-w-sm space-y-1.5">
            <Label htmlFor="schedule-staff">Staff</Label>
            <select
              id="schedule-staff"
              name="staff_id"
              required
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <ul className="divide-y rounded-lg border">
            {days.map((day, dayOfWeek) => (
              <li
                key={dayOfWeek}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-[7rem]">
                  <p className="font-medium">{DAY_NAMES[dayOfWeek]}</p>
                  <p className="text-xs text-muted-foreground">
                    {day.closed ? "Day off" : `${day.start} – ${day.end}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`day_${dayOfWeek}_closed`}
                      value="1"
                      checked={day.closed}
                      onChange={(e) => patchDay(dayOfWeek, { closed: e.target.checked })}
                    />
                    Closed
                  </label>
                  {!day.closed && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs" htmlFor={`day_${dayOfWeek}_start`}>
                          Open
                        </Label>
                        <Input
                          id={`day_${dayOfWeek}_start`}
                          name={`day_${dayOfWeek}_start`}
                          type="time"
                          required
                          value={day.start}
                          onChange={(e) => patchDay(dayOfWeek, { start: e.target.value })}
                          className="h-9 w-[8.5rem]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs" htmlFor={`day_${dayOfWeek}_end`}>
                          Close
                        </Label>
                        <Input
                          id={`day_${dayOfWeek}_end`}
                          name={`day_${dayOfWeek}_end`}
                          type="time"
                          required
                          value={day.end}
                          onChange={(e) => patchDay(dayOfWeek, { end: e.target.value })}
                          className="h-9 w-[8.5rem]"
                        />
                      </div>
                    </>
                  )}
                  {day.closed && (
                    <>
                      <input type="hidden" name={`day_${dayOfWeek}_start`} value={day.start} />
                      <input type="hidden" name={`day_${dayOfWeek}_end`} value={day.end} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save weekly hours"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
