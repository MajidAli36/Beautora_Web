export type StaffPayType = "MONTHLY" | "HOURLY";
export type StaffSalaryPolicy = "FIXED" | "ATTENDANCE_ADJUSTED";
export type PayrollRunStatus = "DRAFT" | "REVIEWED" | "APPROVED" | "PAID";
export type AttendanceDayStatus =
  | "PRESENT"
  | "ABSENT"
  | "LATE"
  | "HALF_DAY"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEKLY_OFF";

export type LateGracePolicy = {
  /** Minutes after duty start before counting as late */
  graceMinutes: number;
  /** Late days allowed per month without fine */
  allowedLateDaysPerMonth: number;
  /** Fine amount applied for each late day beyond the allowance */
  fineAmount: number;
  /** Default duty window HH:MM (used when staff has no personal schedule) */
  defaultDutyStart: string;
  defaultDutyEnd: string;
};

export type StaffCompensation = {
  payType: StaffPayType;
  monthlySalary: number;
  hourlyRate: number;
  expectedHoursPerDay: number;
  expectedDaysPerWeek: number;
  breakMinutesPerDay: number;
  breakPaid: boolean;
  overtimeEligible: boolean;
  overtimeMultiplier: number;
  salaryPolicy: StaffSalaryPolicy;
  /** JS weekday numbers 0=Sun … 6=Sat */
  weeklyOffDays: number[];
  /** Personal duty window HH:MM:SS or HH:MM */
  scheduleStartTime?: string | null;
  scheduleEndTime?: string | null;
  hiredOn?: string | null;
  leftOn?: string | null;
  salaryEffectiveFrom?: string | null;
};

export type AttendanceSessionInput = {
  checkInAt: string;
  checkOutAt: string | null;
  breakMinutes?: number;
  approved?: boolean;
};

export type AttendanceDayOverride = {
  workDate: string; // YYYY-MM-DD
  status: AttendanceDayStatus;
  payableHours?: number | null;
};

export type ProposedLateFine = {
  workDate: string;
  minutesLate: number;
  graceMinutes: number;
  amount: number;
  /** Index among late days this month (1-based) */
  lateOccurrence: number;
  beyondAllowance: boolean;
};

export type StaffPayrollInput = {
  staffId: string;
  staffName: string;
  employeeCode?: string | null;
  department?: string | null;
  compensation: StaffCompensation;
  sessions: AttendanceSessionInput[];
  dayOverrides?: AttendanceDayOverride[];
  /** Advances already paid in the period (deducted from net — not paid again). */
  advances: number;
  /**
   * Extra earnings to include in this run's gross (unpaid accruals only).
   * Do NOT pass bonuses that were already paid via staff_payments — that double-pays.
   */
  otherEarnings?: number;
  /**
   * Bonuses already paid as staff_payments this period (display/note only — not in gross).
   */
  alreadyPaidBonus?: number;
  otherDeductions?: number;
  /** Org late/grace policy */
  latePolicy?: LateGracePolicy | null;
  /** Sum of OPEN (non-waived) fines already recorded for the period */
  openFineAmount?: number;
  /**
   * Waived fine dates: amount forced to 0, but the day still consumes a free late slot.
   */
  waivedFineDates?: string[];
};

export type StaffPayrollLineResult = {
  staffId: string;
  staffName: string;
  employeeCode: string | null;
  department: string | null;
  payType: StaffPayType;
  salaryPolicy: StaffSalaryPolicy;
  baseRate: number;
  daysPresent: number;
  daysAbsent: number;
  daysLeave: number;
  expectedWorkingDays: number;
  regularHours: number;
  overtimeHours: number;
  regularEarnings: number;
  overtimeEarnings: number;
  otherEarnings: number;
  grossEarnings: number;
  advances: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  lateFines: ProposedLateFine[];
  lateFineTotal: number;
  breakdown: {
    payableHours: number;
    unpaidBreakHours: number;
    lateDays: number;
    finedLateDays: number;
    waivedLateDays: number;
    graceLateDays: number;
    halfDays: number;
    holidayDays: number;
    weeklyOffDays: number;
    dutyStart: string | null;
    dutyEnd: string | null;
    policy: StaffSalaryPolicy;
    notes: string[];
  };
};
