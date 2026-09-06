import { isSameLocalDay } from "@/lib/booking/dates";
import {
  addLocalDays,
  getLocalDateString,
  getLocalDayOfWeek,
  getLocalMinutesSinceMidnight,
  pakistanDateTimeToIso,
} from "@/lib/dates/local";
import { formatTime } from "@/lib/format";
import type { BusinessDayKey, BusinessHoursDay } from "@/lib/store/profile";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/store/profile";

export type BookableSlot = {
  iso: string;
  label: string;
  staffId: string;
  staffName: string;
  /** False when another appointment already occupies this time for the stylist. */
  available: boolean;
};

export type SlotEmptyReason =
  | "invalid_date"
  | "out_of_range"
  | "closed"
  | "past_closing"
  | "no_staff"
  | "fully_booked"
  | "duration_too_long";

export type SlotAvailabilityResult = {
  slots: BookableSlot[];
  emptyReason?: SlotEmptyReason;
};

type StaffRow = { id: string; full_name: string; online_booking_enabled?: boolean };
type ScheduleRow = { staff_id: string; day_of_week: number; start_time: string; end_time: string };
type AppointmentRow = {
  id: string;
  staff_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
};

export type DayHoursFallback = {
  open: string;
  close: string;
  closed: boolean;
};

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "18:00";

const DOW_TO_KEY: BusinessDayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function timeToMinutes(time: string): number {
  const parts = time.slice(0, 5).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function overlaps(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number
): boolean {
  return aStart < bStart + bDuration && bStart < aStart + aDuration;
}

/** True when staff schedule marks an explicit day off (equal start/end). */
export function isStaffDayOff(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) === timeToMinutes(endTime);
}

export function businessHoursForDay(
  hours: BusinessHoursDay[] | null | undefined,
  dayOfWeek: number
): DayHoursFallback {
  const key = DOW_TO_KEY[dayOfWeek] ?? "mon";
  const list = hours?.length ? hours : DEFAULT_BUSINESS_HOURS;
  const day = list.find((h) => h.day === key) ?? DEFAULT_BUSINESS_HOURS.find((h) => h.day === key);
  if (!day) {
    return { open: DEFAULT_OPEN, close: DEFAULT_CLOSE, closed: false };
  }
  return {
    open: day.open.slice(0, 5),
    close: day.close.slice(0, 5),
    closed: day.closed,
  };
}

function resolveOpenClose(
  sched: ScheduleRow | undefined,
  fallback: DayHoursFallback
): { openMin: number; closeMin: number; closed: boolean } {
  if (sched) {
    if (isStaffDayOff(sched.start_time, sched.end_time)) {
      return { openMin: 0, closeMin: 0, closed: true };
    }
    return {
      openMin: timeToMinutes(sched.start_time),
      closeMin: timeToMinutes(sched.end_time),
      closed: false,
    };
  }
  if (fallback.closed) {
    return { openMin: 0, closeMin: 0, closed: true };
  }
  return {
    openMin: timeToMinutes(fallback.open),
    closeMin: timeToMinutes(fallback.close),
    closed: false,
  };
}

export function computeAvailableSlots(params: {
  date: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  staff: StaffRow[];
  schedules: ScheduleRow[];
  appointments: AppointmentRow[];
  staffId?: string | null;
  excludeAppointmentId?: string;
  maxDaysAhead?: number;
  onlineOnly?: boolean;
  businessHours?: BusinessHoursDay[] | null;
}): BookableSlot[] {
  return computeAvailableSlotsDetailed(params).slots;
}

export function computeAvailableSlotsDetailed(params: {
  date: string;
  durationMinutes: number;
  slotIntervalMinutes: number;
  staff: StaffRow[];
  schedules: ScheduleRow[];
  appointments: AppointmentRow[];
  staffId?: string | null;
  excludeAppointmentId?: string;
  maxDaysAhead?: number;
  onlineOnly?: boolean;
  businessHours?: BusinessHoursDay[] | null;
}): SlotAvailabilityResult {
  const {
    date,
    durationMinutes,
    slotIntervalMinutes,
    staff,
    schedules,
    appointments,
    staffId,
    excludeAppointmentId,
    maxDaysAhead = 30,
    onlineOnly = false,
    businessHours,
  } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { slots: [], emptyReason: "invalid_date" };
  }

  const todayStr = getLocalDateString();
  const maxDateStr = addLocalDays(todayStr, maxDaysAhead);
  if (date < todayStr || date > maxDateStr) {
    return { slots: [], emptyReason: "out_of_range" };
  }

  const dayOfWeek = getLocalDayOfWeek(date);
  const fallback = businessHoursForDay(businessHours, dayOfWeek);
  const scheduleByStaff = new Map<string, ScheduleRow>();
  for (const s of schedules) {
    if (s.day_of_week === dayOfWeek) scheduleByStaff.set(s.staff_id, s);
  }

  const dayAppointments = appointments.filter((a) => {
    if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
    return isSameLocalDay(a.scheduled_at, date);
  });

  let targetStaff = staffId ? staff.filter((s) => s.id === staffId) : staff;
  if (onlineOnly) {
    targetStaff = targetStaff.filter((s) => s.online_booking_enabled);
  }
  if (!targetStaff.length) {
    return { slots: [], emptyReason: "no_staff" };
  }

  const slots: BookableSlot[] = [];
  const now = new Date();
  const nowMin = getLocalMinutesSinceMidnight(now);
  const isToday = date === todayStr;

  let anyOpenWindow = false;
  let anyWindowFitsDuration = false;
  let anyFutureStartInWindow = false;

  for (const member of targetStaff) {
    const resolved = resolveOpenClose(scheduleByStaff.get(member.id), fallback);
    if (resolved.closed) continue;
    anyOpenWindow = true;

    const { openMin, closeMin } = resolved;
    if (closeMin - openMin < durationMinutes) continue;
    anyWindowFitsDuration = true;

    for (
      let startMin = openMin;
      startMin + durationMinutes <= closeMin;
      startMin += slotIntervalMinutes
    ) {
      if (isToday && startMin <= nowMin) continue;
      anyFutureStartInWindow = true;

      const iso = pakistanDateTimeToIso(date, minutesToTime(startMin));
      const slotDate = new Date(iso);

      const conflict = dayAppointments.some((appt) => {
        const apptStartMin = getLocalMinutesSinceMidnight(new Date(appt.scheduled_at));
        const blocksStaff = appt.staff_id === null || appt.staff_id === member.id;
        if (!blocksStaff) return false;
        return overlaps(startMin, durationMinutes, apptStartMin, appt.duration_minutes);
      });

      slots.push({
        iso,
        label: formatTime(slotDate),
        staffId: member.id,
        staffName: member.full_name,
        available: !conflict,
      });
    }
  }

  const sorted = slots.sort((a, b) => {
    const byTime = a.iso.localeCompare(b.iso);
    if (byTime !== 0) return byTime;
    return Number(b.available) - Number(a.available);
  });

  const openSlots = sorted.filter((s) => s.available);
  if (openSlots.length > 0) return { slots: sorted };

  if (!anyOpenWindow) return { slots: [], emptyReason: "closed" };
  if (!anyWindowFitsDuration) return { slots: [], emptyReason: "duration_too_long" };
  if (isToday && !anyFutureStartInWindow) return { slots: [], emptyReason: "past_closing" };
  // Still return booked times so the UI can show them as disabled.
  if (sorted.length > 0) return { slots: sorted, emptyReason: "fully_booked" };
  return { slots: [], emptyReason: "fully_booked" };
}

export function sumServiceDuration(
  services: { duration_minutes: number }[],
  fallback = 30
): number {
  if (!services.length) return fallback;
  return services.reduce((sum, s) => sum + Number(s.duration_minutes), 0);
}
