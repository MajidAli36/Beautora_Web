"use client";

import { useActionState, useMemo, useState } from "react";
import { updateStaffCompensation } from "@/lib/actions/staff-compensation";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  hourlyFromMonthly,
  monthlyFromHourly,
  monthlyHoursEstimate,
  syncPayRates,
} from "@/lib/payroll/rate-math";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ActionResult } from "@/types/commerce";
import type { StaffPayType, StaffSalaryPolicy } from "@/lib/payroll/types";
import { cn } from "@/lib/utils";

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

/** Preserve empty array = works all week. Do not force Sunday. */
function initialWeeklyOffs(raw: number[] | null | undefined): number[] {
  if (Array.isArray(raw)) return [...raw].sort((a, b) => a - b);
  return [0];
}

function ChoiceCard({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
        active
          ? "border-primary bg-primary/10 ring-1 ring-primary/40"
          : "border-input bg-background hover:bg-muted/50"
      )}
    >
      <span
        className={cn(
          "block text-sm font-medium",
          active ? "text-foreground" : "text-foreground"
        )}
      >
        {title}
      </span>
      {description ? (
        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
          {description}
        </span>
      ) : null}
    </button>
  );
}

export function StaffCompensationForm({
  staff,
}: {
  staff: CompensationFormValues;
}) {
  const [payType, setPayType] = useState<StaffPayType>(
    staff.pay_type ?? "MONTHLY"
  );
  const [policy, setPolicy] = useState<StaffSalaryPolicy>(
    staff.salary_policy ?? "FIXED"
  );
  const [monthlySalary, setMonthlySalary] = useState(
    staff.monthly_salary != null && staff.monthly_salary > 0
      ? String(staff.monthly_salary)
      : ""
  );
  const [hourlyRate, setHourlyRate] = useState(
    staff.hourly_rate != null && staff.hourly_rate > 0
      ? String(staff.hourly_rate)
      : ""
  );
  const [hoursPerDay, setHoursPerDay] = useState(
    String(staff.expected_hours_per_day ?? 8)
  );
  const [daysPerWeek, setDaysPerWeek] = useState(
    String(staff.expected_days_per_week ?? 6)
  );
  const [offs, setOffs] = useState<number[]>(() =>
    initialWeeklyOffs(staff.weekly_off_days)
  );
  const [state, formAction, pending] = useActionState(
    updateStaffCompensation,
    {} as ActionResult
  );
  useActionToast(state, { successMessage: "Salary configuration saved." });

  const hDay = Number(hoursPerDay) || 8;
  const dWeek = Number(daysPerWeek) || 6;

  const liveRates = useMemo(() => {
    const monthly = Number(monthlySalary) || 0;
    const hourly = Number(hourlyRate) || 0;
    return syncPayRates({
      payType,
      monthlySalary: monthly,
      hourlyRate: hourly,
      hoursPerDay: hDay,
      daysPerWeek: dWeek,
    });
  }, [payType, monthlySalary, hourlyRate, hDay, dWeek]);

  const estHours = monthlyHoursEstimate(hDay, dWeek);

  function toggleOff(day: number) {
    setOffs((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  function onMonthlyChange(value: string) {
    setMonthlySalary(value);
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && value.trim() !== "") {
      setHourlyRate(String(hourlyFromMonthly(n, hDay, dWeek) || ""));
    }
  }

  function onHourlyChange(value: string) {
    setHourlyRate(value);
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && value.trim() !== "") {
      setMonthlySalary(String(monthlyFromHourly(n, hDay, dWeek) || ""));
    }
  }

  function onHoursOrDaysChange(kind: "hours" | "days", value: string) {
    if (kind === "hours") setHoursPerDay(value);
    else setDaysPerWeek(value);
    const nextH = kind === "hours" ? Number(value) || 8 : hDay;
    const nextD = kind === "days" ? Number(value) || 6 : dWeek;
    if (payType === "MONTHLY") {
      const m = Number(monthlySalary) || 0;
      if (m > 0) setHourlyRate(String(hourlyFromMonthly(m, nextH, nextD) || ""));
    } else {
      const h = Number(hourlyRate) || 0;
      if (h > 0) setMonthlySalary(String(monthlyFromHourly(h, nextH, nextD) || ""));
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="staff_id" value={staff.id} />
      <input type="hidden" name="pay_type" value={payType} />
      <input
        type="hidden"
        name="salary_policy"
        value={payType === "MONTHLY" ? policy : "FIXED"}
      />
      <input
        type="hidden"
        name="weekly_off_days"
        value={offs.length ? offs.join(",") : "none"}
      />

      <Tabs defaultValue="pay" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="pay">Pay</TabsTrigger>
          <TabsTrigger value="duty">Duty hours</TabsTrigger>
          <TabsTrigger value="offs">Weekly offs</TabsTrigger>
          <TabsTrigger value="extra">Overtime & dates</TabsTrigger>
        </TabsList>

        <TabsContent value="pay" className="space-y-6 outline-none">
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Profile</h3>
              <p className="text-xs text-muted-foreground">
                Employee ID and department for payroll and reports.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee_code">Employee ID</Label>
                <Input
                  id="employee_code"
                  name="employee_code"
                  defaultValue={staff.employee_code ?? ""}
                  placeholder="EMP-001"
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  name="department"
                  defaultValue={staff.department ?? ""}
                  placeholder="Floor / Spa"
                  className="bg-background"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-6">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Payment type</h3>
              <p className="text-xs text-muted-foreground">
                Enter monthly or hourly — the other amount is calculated from expected
                hours.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                active={payType === "MONTHLY"}
                title="Monthly salary"
                description="Set a monthly base; hourly is calculated."
                onClick={() => {
                  setPayType("MONTHLY");
                  const m = Number(monthlySalary) || 0;
                  if (m > 0) {
                    setHourlyRate(String(hourlyFromMonthly(m, hDay, dWeek) || ""));
                  }
                }}
              />
              <ChoiceCard
                active={payType === "HOURLY"}
                title="Hourly wage"
                description="Set an hourly rate; monthly is estimated."
                onClick={() => {
                  setPayType("HOURLY");
                  const h = Number(hourlyRate) || 0;
                  if (h > 0) {
                    setMonthlySalary(String(monthlyFromHourly(h, hDay, dWeek) || ""));
                  }
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthly_salary">
                  Monthly base salary{payType === "MONTHLY" ? " *" : " (auto)"}
                </Label>
                <Input
                  id="monthly_salary"
                  name="monthly_salary"
                  type="number"
                  min={0}
                  step="0.01"
                  required={payType === "MONTHLY"}
                  readOnly={payType === "HOURLY"}
                  value={monthlySalary}
                  onChange={(e) => onMonthlyChange(e.target.value)}
                  className={cn("bg-background", payType === "HOURLY" && "bg-muted/40")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">
                  Hourly rate{payType === "HOURLY" ? " *" : " (auto)"}
                </Label>
                <Input
                  id="hourly_rate"
                  name="hourly_rate"
                  type="number"
                  min={0}
                  step="0.01"
                  required={payType === "HOURLY"}
                  readOnly={payType === "MONTHLY"}
                  value={hourlyRate}
                  onChange={(e) => onHourlyChange(e.target.value)}
                  className={cn("bg-background", payType === "MONTHLY" && "bg-muted/40")}
                />
              </div>
            </div>

            {payType === "MONTHLY" ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Salary policy</p>
                  <p className="text-xs text-muted-foreground">
                    How absences affect the monthly base pay.
                  </p>
                </div>
                <div className="grid gap-2">
                  <ChoiceCard
                    active={policy === "FIXED"}
                    title="Fixed monthly"
                    description="Full base pay even if they miss a day. Late fines still apply."
                    onClick={() => setPolicy("FIXED")}
                  />
                  <ChoiceCard
                    active={policy === "ATTENDANCE_ADJUSTED"}
                    title="Attendance-adjusted"
                    description="Pay = base × (days present ÷ expected working days). Paid holidays count as present."
                    onClick={() => setPolicy("ATTENDANCE_ADJUSTED")}
                  />
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed">
              <p className="font-medium text-foreground">Hour form (both modes)</p>
              <dl className="mt-2 grid gap-1.5 sm:grid-cols-3">
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Effective hourly</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatCurrency(liveRates.hourlyRate)} / hr
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Equivalent monthly</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {formatCurrency(liveRates.monthlySalary)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2 sm:block">
                  <dt className="text-muted-foreground">Est. hours / month</dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    {estHours > 0 ? estHours.toFixed(1) : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="duty" className="space-y-4 outline-none">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Duty hours</h3>
            <p className="text-xs text-muted-foreground">
              Expected shift and break — used for late fines, overtime, and
              monthly↔hourly conversion.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expected_hours_per_day">Expected hours / day</Label>
              <Input
                id="expected_hours_per_day"
                name="expected_hours_per_day"
                type="number"
                min={0.5}
                max={24}
                step="0.5"
                value={hoursPerDay}
                onChange={(e) => onHoursOrDaysChange("hours", e.target.value)}
                className="bg-background"
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
                value={daysPerWeek}
                onChange={(e) => onHoursOrDaysChange("days", e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_start_time">Scheduled start</Label>
              <Input
                id="schedule_start_time"
                name="schedule_start_time"
                type="time"
                defaultValue={staff.schedule_start_time?.slice(0, 5) ?? ""}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule_end_time">Scheduled end</Label>
              <Input
                id="schedule_end_time"
                name="schedule_end_time"
                type="time"
                defaultValue={staff.schedule_end_time?.slice(0, 5) ?? ""}
                className="bg-background"
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
                className="bg-background"
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
          </div>
        </TabsContent>

        <TabsContent value="offs" className="space-y-4 outline-none">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Weekly off days</h3>
            <p className="text-xs text-muted-foreground">
              Recurring days this person does not work. Leave all unchecked if they work
              all 7 days. One-off holidays are under Holidays & leave.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = offs.includes(d.v);
              return (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => toggleOff(d.v)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {offs.length === 0
              ? "No weekly offs — works every day of the week."
              : `Off: ${offs.map((d) => WEEKDAYS.find((w) => w.v === d)?.label).join(", ")}`}
          </p>
        </TabsContent>

        <TabsContent value="extra" className="space-y-4 outline-none">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Overtime & dates</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_effective_from">Salary effective from</Label>
              <Input
                id="salary_effective_from"
                name="salary_effective_from"
                type="date"
                defaultValue={staff.salary_effective_from ?? ""}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hired_on">Hired on</Label>
              <Input
                id="hired_on"
                name="hired_on"
                type="date"
                defaultValue={staff.hired_on ?? ""}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="left_on">Left on</Label>
              <Input
                id="left_on"
                name="left_on"
                type="date"
                defaultValue={staff.left_on ?? ""}
                className="bg-background"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Change notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Optional audit note for this salary change"
                className="bg-background"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save salary configuration"}
        </Button>
      </div>
    </form>
  );
}
