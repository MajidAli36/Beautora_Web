/**
 * Staff payroll calculation — pure functions, unit-testable.
 * Run: npx tsx --test lib/payroll/calculate.test.ts
 */

import {
  APP_UTC_OFFSET,
  getLocalDateString,
  getLocalDayOfWeek,
} from "@/lib/dates/local";
import { roundMoney } from "@/lib/sales/calculate";
import { detectLateDays, proposeLateFines, resolveDutyWindow } from "@/lib/payroll/late";
import type {
  AttendanceDayOverride,
  AttendanceSessionInput,
  StaffCompensation,
  StaffPayrollInput,
  StaffPayrollLineResult,
} from "@/lib/payroll/types";

/** Round hours to 2 decimal places (centi-hours). */
export function roundHours(n: number): number {
  return Math.round(n * 100) / 100;
}

export function periodBounds(year: number, month: number): {
  start: string;
  end: string;
  daysInMonth: number;
} {
  const daysInMonth = new Date(year, month, 0).getDate();
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`,
    daysInMonth,
  };
}

/** Noon PKT anchor so calendar-day iteration is timezone-stable. */
function parseLocalDate(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00${APP_UTC_OFFSET}`);
}

function clampEmploymentWindow(
  periodStart: string,
  periodEnd: string,
  hiredOn?: string | null,
  leftOn?: string | null,
  salaryEffectiveFrom?: string | null
): { start: string; end: string } | null {
  let start = periodStart;
  let end = periodEnd;
  const effectiveHire = [hiredOn, salaryEffectiveFrom]
    .filter(Boolean)
    .sort()
    .at(-1) as string | undefined;
  if (effectiveHire && effectiveHire > start) start = effectiveHire;
  if (leftOn && leftOn < end) end = leftOn;
  if (start > end) return null;
  return { start, end };
}

/** Calendar working days in range excluding weekly offs. */
export function countExpectedWorkingDays(
  periodStart: string,
  periodEnd: string,
  weeklyOffDays: number[],
  hiredOn?: string | null,
  leftOn?: string | null,
  salaryEffectiveFrom?: string | null
): number {
  const window = clampEmploymentWindow(
    periodStart,
    periodEnd,
    hiredOn,
    leftOn,
    salaryEffectiveFrom
  );
  if (!window) return 0;
  const offs = new Set(weeklyOffDays);
  let count = 0;
  const cursor = parseLocalDate(window.start);
  const last = parseLocalDate(window.end);
  while (cursor <= last) {
    const dateKey = getLocalDateString(cursor);
    if (!offs.has(getLocalDayOfWeek(dateKey))) count += 1;
    cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return count;
}

type DayBucket = {
  date: string;
  minutes: number;
  unpaidBreakMinutes: number;
  sessions: number;
};

function buildDayBuckets(
  sessions: AttendanceSessionInput[],
  compensation: StaffCompensation,
  periodStart: string,
  periodEnd: string
): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>();

  for (const session of sessions) {
    if (session.approved === false) continue;
    if (!session.checkOutAt) continue;
    const startMs = new Date(session.checkInAt).getTime();
    const endMs = new Date(session.checkOutAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) continue;

    const dateKey = getLocalDateString(new Date(session.checkInAt));
    if (dateKey < periodStart || dateKey > periodEnd) continue;

    const elapsed = Math.round((endMs - startMs) / 60000);
    const breakMins =
      session.breakMinutes != null && session.breakMinutes >= 0
        ? session.breakMinutes
        : compensation.breakMinutesPerDay;
    const unpaidBreak = compensation.breakPaid ? 0 : breakMins;

    const existing = buckets.get(dateKey) ?? {
      date: dateKey,
      minutes: 0,
      unpaidBreakMinutes: 0,
      sessions: 0,
    };
    existing.minutes += elapsed;
    // Apply unpaid break once per day (not per session) using max of configured breaks.
    existing.unpaidBreakMinutes = Math.max(existing.unpaidBreakMinutes, unpaidBreak);
    existing.sessions += 1;
    buckets.set(dateKey, existing);
  }

  return buckets;
}

function splitRegularAndOvertime(
  payableHours: number,
  expectedHoursPerDay: number,
  overtimeEligible: boolean
): { regular: number; overtime: number } {
  if (!overtimeEligible || payableHours <= expectedHoursPerDay) {
    return { regular: roundHours(payableHours), overtime: 0 };
  }
  return {
    regular: roundHours(expectedHoursPerDay),
    overtime: roundHours(payableHours - expectedHoursPerDay),
  };
}

/**
 * Calculate one staff member's payroll line for a calendar month period.
 */
export function calculateStaffPayrollLine(
  input: StaffPayrollInput,
  periodStart: string,
  periodEnd: string
): StaffPayrollLineResult | null {
  const c = input.compensation;
  if (!c.payType) return null;

  const window = clampEmploymentWindow(
    periodStart,
    periodEnd,
    c.hiredOn,
    c.leftOn,
    c.salaryEffectiveFrom
  );
  if (!window) return null;

  const expectedWorkingDays = countExpectedWorkingDays(
    periodStart,
    periodEnd,
    c.weeklyOffDays,
    c.hiredOn,
    c.leftOn,
    c.salaryEffectiveFrom
  );

  const overrides = new Map<string, AttendanceDayOverride>();
  for (const o of input.dayOverrides ?? []) {
    if (o.workDate >= window.start && o.workDate <= window.end) {
      overrides.set(o.workDate, o);
    }
  }

  const buckets = buildDayBuckets(input.sessions, c, window.start, window.end);
  const notes: string[] = [];

  let daysPresent = 0;
  let daysAbsent = 0;
  let daysLeave = 0;
  let halfDays = 0;
  let holidayDays = 0;
  let weeklyOffCounted = 0;
  let regularHours = 0;
  let overtimeHours = 0;
  let unpaidBreakHours = 0;

  // Iterate each calendar day in employment window
  const cursor = parseLocalDate(window.start);
  const last = parseLocalDate(window.end);
  const weeklyOffs = new Set(c.weeklyOffDays);

  while (cursor <= last) {
    const dateKey = getLocalDateString(cursor);
    const wd = getLocalDayOfWeek(dateKey);
    const override = overrides.get(dateKey);
    const bucket = buckets.get(dateKey);

    if (override) {
      switch (override.status) {
        case "WEEKLY_OFF":
          weeklyOffCounted += 1;
          break;
        case "HOLIDAY":
          holidayDays += 1;
          break;
        case "ON_LEAVE":
          daysLeave += 1;
          break;
        case "ABSENT":
          daysAbsent += 1;
          break;
        case "HALF_DAY":
          halfDays += 1;
          daysPresent += 0.5;
          {
            const hours =
              override.payableHours != null
                ? override.payableHours
                : c.expectedHoursPerDay / 2;
            const split = splitRegularAndOvertime(
              hours,
              c.expectedHoursPerDay,
              c.overtimeEligible
            );
            regularHours += split.regular;
            overtimeHours += split.overtime;
          }
          break;
        case "LATE":
          daysPresent += 1;
          {
            const payableFromPunch = bucket
              ? Math.max(0, (bucket.minutes - bucket.unpaidBreakMinutes) / 60)
              : c.expectedHoursPerDay;
            unpaidBreakHours += bucket ? bucket.unpaidBreakMinutes / 60 : 0;
            const hours =
              override.payableHours != null ? override.payableHours : payableFromPunch;
            const split = splitRegularAndOvertime(
              hours,
              c.expectedHoursPerDay,
              c.overtimeEligible
            );
            regularHours += split.regular;
            overtimeHours += split.overtime;
          }
          break;
        case "PRESENT":
        default:
          daysPresent += 1;
          {
            const payableFromPunch = bucket
              ? Math.max(0, (bucket.minutes - bucket.unpaidBreakMinutes) / 60)
              : c.expectedHoursPerDay;
            unpaidBreakHours += bucket ? bucket.unpaidBreakMinutes / 60 : 0;
            const hours =
              override.payableHours != null ? override.payableHours : payableFromPunch;
            const split = splitRegularAndOvertime(
              hours,
              c.expectedHoursPerDay,
              c.overtimeEligible
            );
            regularHours += split.regular;
            overtimeHours += split.overtime;
          }
          break;
      }
    } else if (weeklyOffs.has(wd)) {
      weeklyOffCounted += 1;
    } else if (bucket && bucket.minutes > 0) {
      daysPresent += 1;
      const payableMins = Math.max(0, bucket.minutes - bucket.unpaidBreakMinutes);
      unpaidBreakHours += bucket.unpaidBreakMinutes / 60;
      const hours = payableMins / 60;
      const split = splitRegularAndOvertime(
        hours,
        c.expectedHoursPerDay,
        c.overtimeEligible
      );
      regularHours += split.regular;
      overtimeHours += split.overtime;
    } else {
      daysAbsent += 1;
    }

    cursor.setTime(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  regularHours = roundHours(regularHours);
  overtimeHours = roundHours(overtimeHours);
  unpaidBreakHours = roundHours(unpaidBreakHours);
  const payableHours = roundHours(regularHours + overtimeHours);

  const advances = roundMoney(Math.max(0, input.advances));
  const otherEarnings = roundMoney(Math.max(0, input.otherEarnings ?? 0));
  const alreadyPaidBonus = roundMoney(Math.max(0, input.alreadyPaidBonus ?? 0));
  if (alreadyPaidBonus > 0) {
    notes.push(
      `Bonus already paid this period (${alreadyPaidBonus}) — not added to this payroll net.`
    );
  }

  // Late detection vs duty start + monthly grace allowance
  let lateFines: StaffPayrollLineResult["lateFines"] = [];
  let graceLateDays = 0;
  let finedLateDays = 0;
  let waivedLateDays = 0;
  let lateDaysCount = 0;
  const duty = resolveDutyWindow(c, input.latePolicy ?? null);

  if (input.latePolicy) {
    const detected = detectLateDays({
      sessions: input.sessions,
      dayOverrides: input.dayOverrides,
      compensation: c,
      latePolicy: input.latePolicy,
      periodStart: window.start,
      periodEnd: window.end,
      weeklyOffDays: c.weeklyOffDays,
    });
    lateDaysCount = detected.length;
    const proposed = proposeLateFines({
      lateDays: detected,
      latePolicy: input.latePolicy,
      waivedFineDates: input.waivedFineDates,
    });
    lateFines = proposed.fines.filter((f) => f.beyondAllowance && f.amount > 0);
    graceLateDays = proposed.graceLateDays;
    finedLateDays = proposed.finedLateDays;
    waivedLateDays = proposed.waivedLateDays;
    if (finedLateDays > 0) {
      notes.push(
        `${finedLateDays} late day(s) beyond ${input.latePolicy.allowedLateDaysPerMonth}-day monthly grace → fine applied.`
      );
    }
    if (graceLateDays > 0) {
      notes.push(
        `${graceLateDays} late day(s) covered by monthly grace (no fine).`
      );
    }
  }

  const proposedFineTotal = roundMoney(
    lateFines.reduce((s, f) => s + f.amount, 0)
  );
  // Prefer persisted OPEN fines when provided; otherwise use proposed total.
  const lateFineTotal = roundMoney(
    input.openFineAmount != null && input.openFineAmount > 0
      ? input.openFineAmount
      : proposedFineTotal
  );
  const otherDeductions = roundMoney(
    Math.max(0, input.otherDeductions ?? 0) + lateFineTotal
  );

  let baseRate = 0;
  let regularEarnings = 0;
  let overtimeEarnings = 0;

  if (c.payType === "HOURLY") {
    baseRate = roundMoney(c.hourlyRate);
    regularEarnings = roundMoney(regularHours * baseRate);
    overtimeEarnings = roundMoney(
      overtimeHours * baseRate * (c.overtimeEligible ? c.overtimeMultiplier : 1)
    );
  } else {
    baseRate = roundMoney(c.monthlySalary);
    const fullMonthSalary = baseRate;

    if (c.salaryPolicy === "FIXED") {
      // Prorate only for mid-period join/leave by calendar working days.
      if (expectedWorkingDays <= 0) {
        regularEarnings = 0;
        notes.push("No expected working days in period.");
      } else {
        const fullExpected = countExpectedWorkingDays(
          periodStart,
          periodEnd,
          c.weeklyOffDays
        );
        if (fullExpected > 0 && expectedWorkingDays < fullExpected) {
          regularEarnings = roundMoney(
            (fullMonthSalary * expectedWorkingDays) / fullExpected
          );
          notes.push("Prorated fixed salary for partial employment period.");
        } else {
          regularEarnings = fullMonthSalary;
        }
      }
    } else {
      // Attendance-adjusted: pay for present + half days relative to expected days.
      if (expectedWorkingDays <= 0) {
        regularEarnings = 0;
      } else {
        const creditDays = Math.min(daysPresent, expectedWorkingDays);
        regularEarnings = roundMoney(
          (fullMonthSalary * creditDays) / expectedWorkingDays
        );
        notes.push("Salary adjusted by attendance (present days / expected days).");
      }
    }

    overtimeEarnings = roundMoney(
      overtimeHours *
        (c.expectedHoursPerDay > 0
          ? fullMonthSalary / (expectedWorkingDays * c.expectedHoursPerDay || 1)
          : 0) *
        (c.overtimeEligible ? c.overtimeMultiplier : 0)
    );
    if (!c.overtimeEligible) overtimeEarnings = 0;
  }

  const grossEarnings = roundMoney(
    regularEarnings + overtimeEarnings + otherEarnings
  );
  const totalDeductions = roundMoney(advances + otherDeductions);
  const netPay = roundMoney(Math.max(0, grossEarnings - totalDeductions));

  return {
    staffId: input.staffId,
    staffName: input.staffName,
    employeeCode: input.employeeCode ?? null,
    department: input.department ?? null,
    payType: c.payType,
    salaryPolicy: c.salaryPolicy,
    baseRate,
    daysPresent: roundHours(daysPresent),
    daysAbsent: roundHours(daysAbsent),
    daysLeave: roundHours(daysLeave),
    expectedWorkingDays,
    regularHours,
    overtimeHours,
    regularEarnings,
    overtimeEarnings,
    otherEarnings,
    grossEarnings,
    advances,
    otherDeductions,
    totalDeductions,
    netPay,
    lateFines,
    lateFineTotal,
    breakdown: {
      payableHours,
      unpaidBreakHours,
      lateDays: lateDaysCount,
      finedLateDays,
      waivedLateDays,
      graceLateDays,
      halfDays,
      holidayDays,
      weeklyOffDays: weeklyOffCounted,
      dutyStart: duty?.startLabel ?? null,
      dutyEnd: duty?.endLabel ?? null,
      policy: c.salaryPolicy,
      notes,
    },
  };
}

export function sumPayrollLines(lines: StaffPayrollLineResult[]) {
  return {
    totalGross: roundMoney(lines.reduce((s, l) => s + l.grossEarnings, 0)),
    totalDeductions: roundMoney(lines.reduce((s, l) => s + l.totalDeductions, 0)),
    totalNet: roundMoney(lines.reduce((s, l) => s + l.netPay, 0)),
    totalRegularHours: roundHours(lines.reduce((s, l) => s + l.regularHours, 0)),
    totalOvertimeHours: roundHours(lines.reduce((s, l) => s + l.overtimeHours, 0)),
    staffCount: lines.length,
  };
}
