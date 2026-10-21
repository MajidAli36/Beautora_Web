"use client";

import { useActionState, useState } from "react";
import { updateStaffCompensation } from "@/lib/actions/staff-compensation";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/types/commerce";
import type { StaffPayType, StaffSalaryPolicy } from "@/lib/payroll/types";

export type CompensationFormValues = {
  id: string;
  full_name: string;
  employee_code: string | null;
  department: string | null;
  pay_type: StaffPayType | null;
  monthly_salary: number | null;
  hourly_rate: number | null;
  expected_hours_per_day: number | null;
  expected_days_per_week: number | null;
  break_minutes_per_day: number | null;
  break_paid: boolean | null;
  overtime_eligible: boolean | null;
  overtime_multiplier: number | null;
  salary_policy: StaffSalaryPolicy | null;
  weekly_off_days: number[] | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  salary_effective_from: string | null;
  hired_on: string | null;
  left_on: string | null;
};

const WEEKDAYS = [
  { v: 0, label: "Sun" },
  { v: 1, label: "Mon" },
  { v: 2, label: "Tue" },
  { v: 3, label: "Wed" },
  { v: 4, label: "Thu" },
  { v: 5, label: "Fri" },
  { v: 6, label: "Sat" },
];

export function StaffCompensationForm({
  staff,
}: {
  staff: CompensationFormValues;
}) {
  const [payType, setPayType] = useState<StaffPayType>(
    staff.pay_type ?? "MONTHLY"
  );
  const [offs, setOffs] = useState<number[]>(
    staff.weekly_off_days?.length ? staff.weekly_off_days : [0]
  );
  const [state, formAction, pending] = useActionState(
    updateStaffCompensation,
    {} as ActionResult
  );
  useActionToast(state, { successMessage: "Salary configuration saved." });

  function toggleOff(day: number) {
    setOffs((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="staff_id" value={staff.id} />
      <input type="hidden" name="weekly_off_days" value={offs.join(",")} />

      <div className="space-y-2">
        <Label htmlFor="employee_code">Employee ID</Label>
        <Input
          id="employee_code"
          name="employee_code"
          defaultValue={staff.employee_code ?? ""}
          placeholder="EMP-001"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="department">Department</Label>
        <Input
          id="department"
          name="department"
          defaultValue={staff.department ?? ""}
          placeholder="Floor / Spa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pay_type">Payment type *</Label>
        <select
          id="pay_type"
          name="pay_type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          value={payType}
          onChange={(e) => setPayType(e.target.value as StaffPayType)}
        >
          <option value="MONTHLY">Monthly salary</option>
          <option value="HOURLY">Hourly wage</option>
        </select>
      </div>

      {payType === "MONTHLY" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="monthly_salary">Monthly base salary *</Label>
            <Input
              id="monthly_salary"
              name="monthly_salary"
              type="number"
              min={0}
              step="0.01"
              required
              defaultValue={staff.monthly_salary ?? ""}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="salary_policy">Salary policy</Label>
            <select
              id="salary_policy"
              name="salary_policy"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={staff.salary_policy ?? "FIXED"}
            >
              <option value="FIXED">Fixed monthly (attendance does not reduce base)</option>
              <option value="ATTENDANCE_ADJUSTED">
                Attendance-adjusted (unpaid absences reduce pay)
              </option>
            </select>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="hourly_rate">Hourly rate *</Label>
          <Input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={staff.hourly_rate ?? ""}
          />
          <input type="hidden" name="salary_policy" value="FIXED" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="expected_hours_per_day">Expected hours / day</Label>
        <Input
          id="expected_hours_per_day"
          name="expected_hours_per_day"
          type="number"
          min={0.5}
          max={24}
          step="0.5"
          defaultValue={staff.expected_hours_per_day ?? 8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="expected_days_per_week">Expected days / week</Label>
        <Input
          id="expected_days_per_week"
          name="expected_days_per_week"
          type="number"
          min={0.5}
          max={7}
          step="0.5"
          defaultValue={staff.expected_days_per_week ?? 6}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule_start_time">Scheduled start</Label>
        <Input
          id="schedule_start_time"
          name="schedule_start_time"
          type="time"
          defaultValue={staff.schedule_start_time?.slice(0, 5) ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="schedule_end_time">Scheduled end</Label>
        <Input
          id="schedule_end_time"
          name="schedule_end_time"
          type="time"
          defaultValue={staff.schedule_end_time?.slice(0, 5) ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="break_minutes_per_day">Break minutes / day</Label>
        <Input
          id="break_minutes_per_day"
          name="break_minutes_per_day"
          type="number"
          min={0}
          max={480}
          defaultValue={staff.break_minutes_per_day ?? 0}
        />
      </div>
      <div className="flex items-end gap-2 pb-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="break_paid"
            defaultChecked={Boolean(staff.break_paid)}
          />
          Breaks are paid
        </label>
      </div>

      <div className="sm:col-span-2 space-y-2">
        <Label>Weekly off days</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <button
              key={d.v}
              type="button"
              onClick={() => toggleOff(d.v)}
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                offs.includes(d.v)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-2 pb-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="overtime_eligible"
            defaultChecked={Boolean(staff.overtime_eligible)}
          />
          Overtime eligible
        </label>
      </div>
      <div className="space-y-2">
        <Label htmlFor="overtime_multiplier">Overtime multiplier</Label>
        <Input
          id="overtime_multiplier"
          name="overtime_multiplier"
          type="number"
          min={1}
          max={5}
          step="0.1"
          defaultValue={staff.overtime_multiplier ?? 1.5}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="salary_effective_from">Salary effective from</Label>
        <Input
          id="salary_effective_from"
          name="salary_effective_from"
          type="date"
          defaultValue={staff.salary_effective_from ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hired_on">Hired on</Label>
        <Input
          id="hired_on"
          name="hired_on"
          type="date"
          defaultValue={staff.hired_on ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="left_on">Left on</Label>
        <Input
          id="left_on"
          name="left_on"
          type="date"
          defaultValue={staff.left_on ?? ""}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Change notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="Optional audit note for this salary change"
        />
      </div>

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save salary configuration"}
        </Button>
      </div>
    </form>
  );
}
