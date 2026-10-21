/**
 * Run: npx tsx --test lib/payroll/late.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pakistanDateTimeToIso } from "@/lib/dates/local";
import {
  detectLateDays,
  proposeLateFines,
  resolveDutyWindow,
  timeToMinutes,
} from "@/lib/payroll/late";
import type { LateGracePolicy, StaffCompensation } from "@/lib/payroll/types";

const compensation: StaffCompensation = {
  payType: "MONTHLY",
  monthlySalary: 50000,
  hourlyRate: 0,
  expectedHoursPerDay: 8,
  expectedDaysPerWeek: 6,
  breakMinutesPerDay: 0,
  breakPaid: true,
  overtimeEligible: false,
  overtimeMultiplier: 1.5,
  salaryPolicy: "FIXED",
  weeklyOffDays: [0],
  scheduleStartTime: "10:00",
  scheduleEndTime: "20:00",
};

const policy: LateGracePolicy = {
  graceMinutes: 15,
  allowedLateDaysPerMonth: 3,
  fineAmount: 200,
  defaultDutyStart: "10:00",
  defaultDutyEnd: "20:00",
};

/** Build a Pakistan-local ISO string for a calendar day + HH:MM. */
function localPunch(day: string, hh: number, mm: number) {
  const time = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`;
  return pakistanDateTimeToIso(day, time);
}

describe("timeToMinutes / duty window", () => {
  it("parses HH:MM and HH:MM:SS", () => {
    assert.equal(timeToMinutes("10:00"), 600);
    assert.equal(timeToMinutes("10:15:00"), 615);
  });

  it("resolves staff schedule over org default", () => {
    const duty = resolveDutyWindow(compensation, policy);
    assert.ok(duty);
    assert.equal(duty!.startLabel, "10:00");
    assert.equal(duty!.endLabel, "20:00");
  });
});

describe("late detection + grace", () => {
  it("does not mark late within 15-minute grace", () => {
    const late = detectLateDays({
      sessions: [
        {
          checkInAt: localPunch("2026-03-02", 10, 10),
          checkOutAt: localPunch("2026-03-02", 18, 0),
          approved: true,
        },
      ],
      compensation,
      latePolicy: policy,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      weeklyOffDays: [0],
    });
    assert.equal(late.length, 0);
  });

  it("marks late after grace threshold", () => {
    const late = detectLateDays({
      sessions: [
        {
          checkInAt: localPunch("2026-03-02", 10, 20),
          checkOutAt: localPunch("2026-03-02", 18, 0),
          approved: true,
        },
      ],
      compensation,
      latePolicy: policy,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      weeklyOffDays: [0],
    });
    assert.equal(late.length, 1);
    assert.ok(late[0]!.minutesLate >= 20);
  });

  it("allows 3 late days then fines the 4th", () => {
    const days = ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const lateDays = days.map((workDate) => ({
      workDate,
      minutesLate: 25,
      beyondGrace: true,
    }));
    const { fines, graceLateDays, finedLateDays } = proposeLateFines({
      lateDays,
      latePolicy: policy,
    });
    assert.equal(graceLateDays, 3);
    assert.equal(finedLateDays, 1);
    assert.equal(fines.filter((f) => f.amount > 0).length, 1);
    assert.equal(fines.find((f) => f.amount > 0)?.amount, 200);
    assert.equal(fines.find((f) => f.amount > 0)?.workDate, "2026-03-05");
  });

  it("waive removes money but still consumes allowance slot", () => {
    const lateDays = [
      { workDate: "2026-03-02", minutesLate: 30, beyondGrace: true },
      { workDate: "2026-03-03", minutesLate: 30, beyondGrace: true },
      { workDate: "2026-03-04", minutesLate: 30, beyondGrace: true },
      { workDate: "2026-03-05", minutesLate: 30, beyondGrace: true },
      { workDate: "2026-03-06", minutesLate: 30, beyondGrace: true },
    ];
    const { fines, waivedLateDays, finedLateDays, graceLateDays } =
      proposeLateFines({
        lateDays,
        latePolicy: policy,
        waivedFineDates: ["2026-03-05"],
      });
    assert.equal(graceLateDays, 3);
    assert.equal(waivedLateDays, 1);
    assert.equal(finedLateDays, 1);
    assert.equal(fines.find((f) => f.workDate === "2026-03-05")?.amount, 0);
    assert.equal(fines.find((f) => f.workDate === "2026-03-06")?.amount, 200);
  });

  it("uses Pakistan clock so UTC host TZ cannot hide morning lates", () => {
    // 10:20 PKT = 05:20 UTC — must still count as 20 minutes late vs 10:00 duty.
    const late = detectLateDays({
      sessions: [
        {
          checkInAt: "2026-03-02T05:20:00.000Z",
          checkOutAt: "2026-03-02T13:00:00.000Z",
          approved: true,
        },
      ],
      compensation,
      latePolicy: policy,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      weeklyOffDays: [0],
    });
    assert.equal(late.length, 1);
    assert.equal(late[0]!.minutesLate, 20);
    assert.equal(late[0]!.workDate, "2026-03-02");
  });

  it("ignores punches on leave / holiday override days", () => {
    const late = detectLateDays({
      sessions: [
        {
          checkInAt: localPunch("2026-03-02", 10, 40),
          checkOutAt: localPunch("2026-03-02", 18, 0),
          approved: true,
        },
      ],
      dayOverrides: [{ workDate: "2026-03-02", status: "ON_LEAVE" }],
      compensation,
      latePolicy: policy,
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      weeklyOffDays: [0],
    });
    assert.equal(late.length, 0);
  });
});
