/**
 * Monthly ↔ hourly conversion for staff pay.
 * Both entry modes share one effective hourly rate for overtime and hour-based math.
 *
 * Config estimate uses average weeks/month (52/12).
 * Period payroll can pass expectedWorkingDays for a month-specific hourly.
 */

import { roundMoney } from "@/lib/sales/calculate";
import type { StaffCompensation, StaffPayType } from "@/lib/payroll/types";

/** Average weeks in a month — used when converting salary ↔ hourly on the form. */
export const WEEKS_PER_MONTH = 52 / 12;

export function monthlyHoursEstimate(
  hoursPerDay: number,
  daysPerWeek: number
): number {
  const h = Math.max(0, Number(hoursPerDay) || 0);
  const d = Math.max(0, Number(daysPerWeek) || 0);
  return h * d * WEEKS_PER_MONTH;
}

/** Monthly salary → equivalent hourly rate (config / form). */
export function hourlyFromMonthly(
  monthlySalary: number,
  hoursPerDay: number,
  daysPerWeek: number
): number {
  const hours = monthlyHoursEstimate(hoursPerDay, daysPerWeek);
  if (!(hours > 0) || !(monthlySalary > 0)) return 0;
  return roundMoney(Number(monthlySalary) / hours);
}

/** Hourly rate → equivalent monthly salary (config / form). */
export function monthlyFromHourly(
  hourlyRate: number,
  hoursPerDay: number,
  daysPerWeek: number
): number {
  const hours = monthlyHoursEstimate(hoursPerDay, daysPerWeek);
  if (!(hours > 0) || !(hourlyRate > 0)) return 0;
  return roundMoney(Number(hourlyRate) * hours);
}

/**
 * Effective hourly used for overtime and hour-form math.
 * - HOURLY: stored hourly_rate
 * - MONTHLY: monthly ÷ (expected working days in period × hours/day),
 *   falling back to config estimate when period days are unknown
 */
export function resolveEffectiveHourlyRate(
  c: Pick<
    StaffCompensation,
    | "payType"
    | "monthlySalary"
    | "hourlyRate"
    | "expectedHoursPerDay"
    | "expectedDaysPerWeek"
  >,
  opts?: { expectedWorkingDays?: number }
): number {
  if (c.payType === "HOURLY") {
    if (c.hourlyRate > 0) return roundMoney(c.hourlyRate);
    // Legacy / incomplete rows: derive from monthly if present
    return hourlyFromMonthly(
      c.monthlySalary,
      c.expectedHoursPerDay,
      c.expectedDaysPerWeek
    );
  }

  // MONTHLY — prefer period-accurate divisor when available
  const days = opts?.expectedWorkingDays;
  if (
    c.monthlySalary > 0 &&
    days != null &&
    days > 0 &&
    c.expectedHoursPerDay > 0
  ) {
    return roundMoney(
      c.monthlySalary / (days * c.expectedHoursPerDay)
    );
  }

  if (c.monthlySalary > 0) {
    return hourlyFromMonthly(
      c.monthlySalary,
      c.expectedHoursPerDay,
      c.expectedDaysPerWeek
    );
  }

  return roundMoney(Math.max(0, c.hourlyRate || 0));
}

/** Stored / display monthly amount for the chosen pay type. */
export function resolveDisplayMonthly(
  payType: StaffPayType,
  monthlySalary: number,
  hourlyRate: number,
  hoursPerDay: number,
  daysPerWeek: number
): number {
  if (payType === "MONTHLY" && monthlySalary > 0) {
    return roundMoney(monthlySalary);
  }
  if (hourlyRate > 0) {
    return monthlyFromHourly(hourlyRate, hoursPerDay, daysPerWeek);
  }
  return roundMoney(Math.max(0, monthlySalary || 0));
}

/** Pair both amounts so DB always has monthly + hourly in sync. */
export function syncPayRates(input: {
  payType: StaffPayType;
  monthlySalary: number;
  hourlyRate: number;
  hoursPerDay: number;
  daysPerWeek: number;
}): { monthlySalary: number; hourlyRate: number } {
  const hoursPerDay = Math.max(0.5, Number(input.hoursPerDay) || 8);
  const daysPerWeek = Math.max(0.5, Math.min(7, Number(input.daysPerWeek) || 6));

  if (input.payType === "MONTHLY") {
    const monthly = roundMoney(Math.max(0, Number(input.monthlySalary) || 0));
    return {
      monthlySalary: monthly,
      hourlyRate: hourlyFromMonthly(monthly, hoursPerDay, daysPerWeek),
    };
  }

  const hourly = roundMoney(Math.max(0, Number(input.hourlyRate) || 0));
  return {
    hourlyRate: hourly,
    monthlySalary: monthlyFromHourly(hourly, hoursPerDay, daysPerWeek),
  };
}
