/**
 * Duty-window late detection + monthly grace allowance.
 * All punch dates/times use Pakistan Standard Time (Asia/Karachi) — never host TZ.
 * Run via: npx tsx --test lib/payroll/late.test.ts
 */

import {
  getLocalDateString,
  getLocalDayOfWeek,
  getLocalMinutesSinceMidnight,
} from "@/lib/dates/local";
import { roundMoney } from "@/lib/sales/calculate";
import type {
  AttendanceDayOverride,
  AttendanceSessionInput,
  LateGracePolicy,
  ProposedLateFine,
  StaffCompensation,
} from "@/lib/payroll/types";

/** Normalize "10:00:00" / "10:00" → minutes from midnight. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export function resolveDutyWindow(
  compensation: StaffCompensation,
  policy?: LateGracePolicy | null
): { startMinutes: number; endMinutes: number; startLabel: string; endLabel: string } | null {
  const start =
    timeToMinutes(compensation.scheduleStartTime) ??
    timeToMinutes(policy?.defaultDutyStart ?? null);
  const end =
    timeToMinutes(compensation.scheduleEndTime) ??
    timeToMinutes(policy?.defaultDutyEnd ?? null);
  if (start == null || end == null) return null;
  const fmt = (mins: number) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  return {
    startMinutes: start,
    endMinutes: end,
    startLabel: fmt(start),
    endLabel: fmt(end),
  };
}

/**
 * First approved check-in per local calendar day (earliest punch).
 */
export function earliestCheckInByDay(
  sessions: AttendanceSessionInput[],
  periodStart: string,
  periodEnd: string
): Map<string, { checkInAt: string; localMinutes: number }> {
  const map = new Map<string, { checkInAt: string; localMinutes: number }>();
  for (const s of sessions) {
    if (s.approved === false) continue;
    const instant = new Date(s.checkInAt);
    const key = getLocalDateString(instant);
    if (key < periodStart || key > periodEnd) continue;
    const localMinutes = getLocalMinutesSinceMidnight(instant);
    const existing = map.get(key);
    if (!existing || instant.getTime() < new Date(existing.checkInAt).getTime()) {
      map.set(key, { checkInAt: s.checkInAt, localMinutes });
    }
  }
  return map;
}

export type LateDayInfo = {
  workDate: string;
  minutesLate: number;
  beyondGrace: boolean;
};

/**
 * Detect late days vs duty start + grace.
 * LATE day-overrides always count as late (minutes from punch when available).
 */
export function detectLateDays(input: {
  sessions: AttendanceSessionInput[];
  dayOverrides?: AttendanceDayOverride[];
  compensation: StaffCompensation;
  latePolicy: LateGracePolicy;
  periodStart: string;
  periodEnd: string;
  weeklyOffDays: number[];
}): LateDayInfo[] {
  const duty = resolveDutyWindow(input.compensation, input.latePolicy);
  if (!duty) return [];

  const grace = Math.max(0, input.latePolicy.graceMinutes);
  const threshold = duty.startMinutes + grace;
  const offs = new Set(input.weeklyOffDays);
  const checkIns = earliestCheckInByDay(
    input.sessions,
    input.periodStart,
    input.periodEnd
  );
  const overrideLate = new Set(
    (input.dayOverrides ?? [])
      .filter((o) => o.status === "LATE")
      .map((o) => o.workDate)
  );
  // Leave / holiday / absent / weekly-off overrides never count as late days.
  const skipLateDates = new Set(
    (input.dayOverrides ?? [])
      .filter((o) =>
        o.status === "ON_LEAVE" ||
        o.status === "HOLIDAY" ||
        o.status === "ABSENT" ||
        o.status === "WEEKLY_OFF"
      )
      .map((o) => o.workDate)
  );

  const late: LateDayInfo[] = [];
  const seen = new Set<string>();

  for (const [date, punch] of checkIns) {
    const wd = getLocalDayOfWeek(date);
    if (offs.has(wd) || skipLateDates.has(date)) continue;

    const minutesLate = Math.max(0, punch.localMinutes - duty.startMinutes);
    const isOverrideLate = overrideLate.has(date);
    const beyondGrace = punch.localMinutes > threshold || isOverrideLate;
    if (!beyondGrace) continue;

    late.push({
      workDate: date,
      minutesLate: isOverrideLate ? Math.max(minutesLate, grace + 1) : minutesLate,
      beyondGrace: true,
    });
    seen.add(date);
  }

  for (const date of overrideLate) {
    if (seen.has(date)) continue;
    if (date < input.periodStart || date > input.periodEnd) continue;
    if (skipLateDates.has(date)) continue;
    if (offs.has(getLocalDayOfWeek(date))) continue;
    late.push({
      workDate: date,
      minutesLate: grace + 1,
      beyondGrace: true,
    });
  }

  return late.sort((a, b) => a.workDate.localeCompare(b.workDate));
}

/**
 * Apply monthly late allowance: first N late days free, rest get fineAmount.
 * Chronological late days consume free slots in order.
 * Waive only zeroes the money charge — it does not free an allowance slot.
 */
export function proposeLateFines(input: {
  lateDays: LateDayInfo[];
  latePolicy: LateGracePolicy;
  waivedFineDates?: string[];
}): {
  fines: ProposedLateFine[];
  graceLateDays: number;
  finedLateDays: number;
  waivedLateDays: number;
} {
  const waived = new Set(input.waivedFineDates ?? []);
  const allowed = Math.max(0, input.latePolicy.allowedLateDaysPerMonth);
  const amount = roundMoney(Math.max(0, input.latePolicy.fineAmount));

  const fines: ProposedLateFine[] = [];
  let graceLateDays = 0;
  let finedLateDays = 0;
  let waivedLateDays = 0;

  input.lateDays.forEach((day, idx) => {
    const occurrence = idx + 1;
    const beyondAllowance = occurrence > allowed;
    const isWaived = waived.has(day.workDate);

    if (!beyondAllowance) {
      graceLateDays += 1;
      fines.push({
        workDate: day.workDate,
        minutesLate: day.minutesLate,
        graceMinutes: input.latePolicy.graceMinutes,
        amount: 0,
        lateOccurrence: occurrence,
        beyondAllowance: false,
      });
      return;
    }

    if (isWaived) {
      waivedLateDays += 1;
      fines.push({
        workDate: day.workDate,
        minutesLate: day.minutesLate,
        graceMinutes: input.latePolicy.graceMinutes,
        amount: 0,
        lateOccurrence: occurrence,
        beyondAllowance: true,
      });
      return;
    }

    finedLateDays += 1;
    fines.push({
      workDate: day.workDate,
      minutesLate: day.minutesLate,
      graceMinutes: input.latePolicy.graceMinutes,
      amount,
      lateOccurrence: occurrence,
      beyondAllowance: true,
    });
  });

  return { fines, graceLateDays, finedLateDays, waivedLateDays };
}
