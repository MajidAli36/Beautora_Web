"use server";

import { getAppointments } from "@/lib/actions/appointments";
import { canAccessFeature } from "@/lib/auth/permissions";
import { getPendingDepositTotal } from "@/lib/booking/pricing";
import { addLocalDays, getLocalDateString } from "@/lib/dates/local";

export type AppointmentListRow = Awaited<ReturnType<typeof getAppointments>>[number];

/** @deprecated Use AppointmentListRow */
export type OnlineAppointmentRow = AppointmentListRow;

export type AppointmentListFilter = {
  date?: string | null;
};

const CLOSED_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"] as const;

function parseDate(filter?: AppointmentListFilter | string): string | null {
  if (typeof filter === "string") {
    return /^\d{4}-\d{2}-\d{2}$/.test(filter) ? filter : null;
  }
  if (filter?.date && /^\d{4}-\d{2}-\d{2}$/.test(filter.date)) return filter.date;
  return null;
}

async function canViewInHouseAppointments() {
  return canAccessFeature("appointments");
}

/** In-house / reception appointments for one calendar day (STAFF source). */
export async function fetchInHouseAppointments(
  date: string
): Promise<AppointmentListRow[]> {
  if (!(await canViewInHouseAppointments())) return [];
  return getAppointments(date, {
    source: "STAFF",
    excludeStatuses: [...CLOSED_STATUSES],
  });
}

/**
 * Open online bookings (not billed / cancelled / no-show).
 * Default window: recent past through upcoming days. Optional single-day filter.
 */
export async function fetchOnlineAppointments(
  filter?: AppointmentListFilter | string
): Promise<AppointmentListRow[]> {
  const date = parseDate(filter);

  if (date) {
    return getAppointments(date, {
      source: "ONLINE",
      excludeStatuses: [...CLOSED_STATUSES],
    });
  }

  const today = getLocalDateString();
  return getAppointments(undefined, {
    source: "ONLINE",
    from: addLocalDays(today, -14),
    to: addLocalDays(today, 90),
    excludeStatuses: [...CLOSED_STATUSES],
  });
}

/**
 * Incoming inbox: open appointments with a pending advance,
 * or brand-new online bookings still SCHEDULED.
 * Online-only roles never see STAFF-source rows.
 */
export async function fetchIncomingAppointments(options?: {
  onlineOnly?: boolean;
}): Promise<AppointmentListRow[]> {
  const onlineOnly =
    options?.onlineOnly === true || !(await canViewInHouseAppointments());

  const today = getLocalDateString();
  const rows = await getAppointments(undefined, {
    source: onlineOnly ? "ONLINE" : undefined,
    from: addLocalDays(today, -14),
    to: addLocalDays(today, 90),
    excludeStatuses: [...CLOSED_STATUSES],
  });

  return rows.filter((row) => {
    const pending = getPendingDepositTotal(row.deposits ?? []);
    if (pending > 0) return true;
    return row.source === "ONLINE" && row.status === "SCHEDULED";
  });
}

/**
 * History: completed (POS), no-show, cancelled — all sources by default.
 * Past + present + future; newest scheduled first.
 * Online-only roles are forced to ONLINE source.
 */
export async function fetchAppointmentHistory(
  filter?: AppointmentListFilter & { source?: "ONLINE" | "STAFF" | "ALL" }
): Promise<AppointmentListRow[]> {
  const date = parseDate(filter);
  const canInHouse = await canViewInHouseAppointments();
  let source =
    filter?.source && filter.source !== "ALL" ? filter.source : undefined;
  if (!canInHouse) {
    source = "ONLINE";
  }

  if (date) {
    return getAppointments(date, {
      source,
      statuses: [...CLOSED_STATUSES],
      includeSoftDeleted: true,
    });
  }

  const today = getLocalDateString();
  return getAppointments(undefined, {
    source,
    from: addLocalDays(today, -365),
    to: addLocalDays(today, 90),
    statuses: [...CLOSED_STATUSES],
    includeSoftDeleted: true,
  });
}

/** @deprecated Prefer fetchAppointmentHistory({ source: "ONLINE" }) */
export async function fetchCompletedOnlineAppointments(
  filter?: AppointmentListFilter
): Promise<AppointmentListRow[]> {
  return fetchAppointmentHistory({ ...filter, source: "ONLINE" });
}
