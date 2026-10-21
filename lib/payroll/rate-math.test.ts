import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hourlyFromMonthly,
  monthlyFromHourly,
  syncPayRates,
} from "@/lib/payroll/rate-math";

describe("monthly ↔ hourly sync", () => {
  it("20000 monthly @ 8h × 6d ≈ hourly used in hour forms", () => {
    const hourly = hourlyFromMonthly(20000, 8, 6);
    assert.ok(hourly > 0);
    // 8 * 6 * (52/12) = 208 hours/month → 20000/208 ≈ 96.15
    assert.equal(hourly, 96.15);
    const back = monthlyFromHourly(hourly, 8, 6);
    // 2-decimal money rounding: within 1 rupee of original
    assert.ok(Math.abs(back - 20000) < 1);
  });

  it("syncPayRates stores both sides for MONTHLY and HOURLY", () => {
    const m = syncPayRates({
      payType: "MONTHLY",
      monthlySalary: 20000,
      hourlyRate: 0,
      hoursPerDay: 8,
      daysPerWeek: 6,
    });
    assert.equal(m.monthlySalary, 20000);
    assert.equal(m.hourlyRate, 96.15);

    const h = syncPayRates({
      payType: "HOURLY",
      monthlySalary: 0,
      hourlyRate: 100,
      hoursPerDay: 8,
      daysPerWeek: 6,
    });
    assert.equal(h.hourlyRate, 100);
    assert.equal(h.monthlySalary, 20800);
  });
});
