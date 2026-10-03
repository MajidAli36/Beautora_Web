/** Whole minutes between two ISO timestamps (null if incomplete). */
export function attendanceDurationMinutes(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined
): number | null {
  if (!checkInAt || !checkOutAt) return null;
  const start = new Date(checkInAt).getTime();
  const end = new Date(checkOutAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.max(0, Math.round((end - start) / 60000));
}

/** Human label: 95 → "1h 35m", 40 → "40m" */
export function formatAttendanceMinutes(mins: number | null | undefined): string {
  if (mins == null || mins < 0) return "—";
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
