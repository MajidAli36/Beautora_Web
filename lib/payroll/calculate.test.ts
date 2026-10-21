/**
 * Run: npx tsx --test lib/payroll/calculate.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateStaffPayrollLine,
  countExpectedWorkingDays,
  periodBounds,
  roundHours,
  sumPayrollLines,
} from "@/lib/payroll/calculate";
import type { StaffCompensation, StaffPayrollInput } from "@/lib/payroll/types";

const baseHourly: StaffCompensation = {
  payType: "HOURLY",
  monthlySalary: 0,
  hourlyRate: 500,
  expectedHoursPerDay: 8,
  expectedDaysPerWeek: 6,
  breakMinutesPerDay: 60,
  breakPaid: false,
  overtimeEligible: true,
  overtimeMultiplier: 1.5,
  salaryPolicy: "FIXED",
  weeklyOffDays: [0],
};

const baseMonthly: StaffCompensation = {
  payType: "MONTHLY",
  monthlySalary: 60000,
  hourlyRate: 0,
  expectedHoursPerDay: 8,
  expectedDaysPerWeek: 6,
  breakMinutesPerDay: 0,
  breakPaid: true,
  overtimeEligible: false,
  overtimeMultiplier: 1.5,
  salaryPolicy: "FIXED",
  weeklyOffDays: [0],
};

function session(day: string, inH: number, outH: number, breakMinutes = 0) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    checkInAt: `${day}T${pad(inH)}:00:00.000Z`,
    checkOutAt: `${day}T${pad(outH)}:00:00.000Z`,
    breakMinutes,
    approved: true,
  };
}

describe("periodBounds", () => {
  it("returns correct February 2026 bounds", () => {
    const b = periodBounds(2026, 2);
    assert.equal(b.start, "2026-02-01");
    assert.equal(b.end, "2026-02-28");
    assert.equal(b.daysInMonth, 28);
  });
});

describe("countExpectedWorkingDays", () => {
  it("excludes weekly offs", () => {
    // March 2026: 31 days, Sundays = 1,8,15,22,29 → 5 offs → 26 working
    const n = countExpectedWorkingDays("2026-03-01", "2026-03-31", [0]);
    assert.equal(n, 26);
  });

  it("prorates for mid-month hire", () => {
    const n = countExpectedWorkingDays(
      "2026-03-01",
      "2026-03-31",
      [0],
      "2026-03-16"
    );
    assert.ok(n < 26);
    assert.ok(n > 0);
  });
});

describe("hourly wage", () => {
  it("pays regular hours minus unpaid break", () => {
    // 9 hours elapsed, 60m unpaid break → 8 payable, no OT
    const input: StaffPayrollInput = {
      staffId: "s1",
      staffName: "Aisha",
      compensation: baseHourly,
      sessions: [session("2026-03-02", 9, 18, 60)],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.regularHours, 8);
    assert.equal(line!.overtimeHours, 0);
    assert.equal(line!.regularEarnings, 4000);
    assert.equal(line!.netPay, 4000);
  });

  it("applies overtime multiplier above expected daily hours", () => {
    // 11h elapsed, 0 break → 8 regular + 3 OT @ 1.5
    const input: StaffPayrollInput = {
      staffId: "s1",
      staffName: "Aisha",
      compensation: { ...baseHourly, breakMinutesPerDay: 0 },
      sessions: [session("2026-03-02", 8, 19, 0)],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.regularHours, 8);
    assert.equal(line!.overtimeHours, 3);
    assert.equal(line!.regularEarnings, 4000);
    assert.equal(line!.overtimeEarnings, roundHours(3 * 500 * 1.5));
  });

  it("subtracts advances from net", () => {
    const input: StaffPayrollInput = {
      staffId: "s1",
      staffName: "Aisha",
      compensation: { ...baseHourly, breakMinutesPerDay: 0 },
      sessions: [session("2026-03-02", 9, 17, 0)],
      advances: 1000,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.grossEarnings, 4000);
    assert.equal(line!.totalDeductions, 1000);
    assert.equal(line!.netPay, 3000);
  });

  it("ignores incomplete check-out and unapproved sessions", () => {
    const input: StaffPayrollInput = {
      staffId: "s1",
      staffName: "Aisha",
      compensation: { ...baseHourly, breakMinutesPerDay: 0 },
      sessions: [
        { checkInAt: "2026-03-02T09:00:00.000Z", checkOutAt: null, approved: true },
        {
          checkInAt: "2026-03-03T09:00:00.000Z",
          checkOutAt: "2026-03-03T17:00:00.000Z",
          approved: false,
        },
      ],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.regularHours, 0);
    assert.equal(line!.grossEarnings, 0);
  });
});

describe("monthly salary", () => {
  it("pays fixed full monthly salary regardless of absences", () => {
    const input: StaffPayrollInput = {
      staffId: "s2",
      staffName: "Bilal",
      compensation: baseMonthly,
      sessions: [session("2026-03-02", 9, 17)],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.regularEarnings, 60000);
    assert.equal(line!.netPay, 60000);
    assert.ok(line!.daysAbsent > 0);
  });

  it("adjusts salary by attendance when policy is ATTENDANCE_ADJUSTED", () => {
    const input: StaffPayrollInput = {
      staffId: "s2",
      staffName: "Bilal",
      compensation: { ...baseMonthly, salaryPolicy: "ATTENDANCE_ADJUSTED" },
      sessions: [
        session("2026-03-02", 9, 17),
        session("2026-03-03", 9, 17),
      ],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.daysPresent, 2);
    const expected = Math.round((60000 * 2) / line!.expectedWorkingDays * 100) / 100;
    assert.equal(line!.regularEarnings, expected);
  });

  it("prorates fixed salary for mid-month join", () => {
    const input: StaffPayrollInput = {
      staffId: "s2",
      staffName: "Bilal",
      compensation: {
        ...baseMonthly,
        hiredOn: "2026-03-16",
        salaryEffectiveFrom: "2026-03-16",
      },
      sessions: [],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.ok(line!.regularEarnings < 60000);
    assert.ok(line!.regularEarnings > 0);
  });

  it("honors ON_LEAVE override without counting as absent work day pay for adjusted policy", () => {
    const input: StaffPayrollInput = {
      staffId: "s2",
      staffName: "Bilal",
      compensation: { ...baseMonthly, salaryPolicy: "ATTENDANCE_ADJUSTED" },
      sessions: [],
      dayOverrides: [{ workDate: "2026-03-02", status: "ON_LEAVE" }],
      advances: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.daysLeave, 1);
    assert.equal(line!.daysPresent, 0);
  });
});

describe("already-paid bonus", () => {
  it("does not add paid bonus into gross/net", () => {
    const input: StaffPayrollInput = {
      staffId: "s2",
      staffName: "Bilal",
      compensation: baseMonthly,
      sessions: [session("2026-03-02", 9, 17)],
      advances: 0,
      alreadyPaidBonus: 5000,
      otherEarnings: 0,
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.otherEarnings, 0);
    assert.equal(line!.grossEarnings, 60000);
    assert.equal(line!.netPay, 60000);
    assert.ok(
      line!.breakdown.notes.some((n) => n.toLowerCase().includes("bonus already paid"))
    );
  });
});

describe("late fines on payroll line", () => {
  it("deducts fine after monthly free late days are used", () => {
    const days = ["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"];
    const sessions = days.map((day) => ({
      // 10:20 PKT = 05:20 UTC
      checkInAt: `${day}T05:20:00.000Z`,
      checkOutAt: `${day}T13:00:00.000Z`,
      approved: true,
      breakMinutes: 0,
    }));
    const input: StaffPayrollInput = {
      staffId: "s2",
      staffName: "Bilal",
      compensation: {
        ...baseMonthly,
        scheduleStartTime: "10:00",
        scheduleEndTime: "20:00",
      },
      sessions,
      advances: 0,
      latePolicy: {
        graceMinutes: 15,
        allowedLateDaysPerMonth: 3,
        fineAmount: 200,
        defaultDutyStart: "10:00",
        defaultDutyEnd: "20:00",
      },
    };
    const line = calculateStaffPayrollLine(input, "2026-03-01", "2026-03-31");
    assert.ok(line);
    assert.equal(line!.lateFineTotal, 200);
    assert.equal(line!.netPay, 59800);
    assert.equal(line!.breakdown.finedLateDays, 1);
    assert.equal(line!.breakdown.graceLateDays, 3);
  });
});

describe("sumPayrollLines", () => {
  it("aggregates totals", () => {
    const a = calculateStaffPayrollLine(
      {
        staffId: "1",
        staffName: "A",
        compensation: { ...baseHourly, breakMinutesPerDay: 0 },
        sessions: [session("2026-03-02", 9, 17)],
        advances: 500,
      },
      "2026-03-01",
      "2026-03-31"
    )!;
    const b = calculateStaffPayrollLine(
      {
        staffId: "2",
        staffName: "B",
        compensation: baseMonthly,
        sessions: [],
        advances: 0,
      },
      "2026-03-01",
      "2026-03-31"
    )!;
    const sum = sumPayrollLines([a, b]);
    assert.equal(sum.staffCount, 2);
    assert.equal(sum.totalGross, a.grossEarnings + b.grossEarnings);
    assert.equal(sum.totalNet, a.netPay + b.netPay);
  });
});

describe("duplicate / invalid ranges", () => {
  it("returns null when employment window is empty", () => {
    const line = calculateStaffPayrollLine(
      {
        staffId: "x",
        staffName: "X",
        compensation: { ...baseMonthly, leftOn: "2026-02-01" },
        sessions: [],
        advances: 0,
      },
      "2026-03-01",
      "2026-03-31"
    );
    assert.equal(line, null);
  });

  it("ignores inverted check-in/out", () => {
    const line = calculateStaffPayrollLine(
      {
        staffId: "x",
        staffName: "X",
        compensation: { ...baseHourly, breakMinutesPerDay: 0 },
        sessions: [
          {
            checkInAt: "2026-03-02T18:00:00.000Z",
            checkOutAt: "2026-03-02T09:00:00.000Z",
            approved: true,
          },
        ],
        advances: 0,
      },
      "2026-03-01",
      "2026-03-31"
    );
    assert.ok(line);
    assert.equal(line!.regularHours, 0);
    assert.equal(line!.grossEarnings, 0);
  });
});
