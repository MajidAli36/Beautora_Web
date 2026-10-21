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
 *
 * Avoids a 104-day dump + JS filter: pending deposits are resolved by ID,
 * SCHEDULED online/app bookings use a tighter window + status filter.
 */
export async function fetchIncomingAppointments(options?: {
  onlineOnly?: boolean;
}): Promise<AppointmentListRow[]> {
  const onlineOnly =
    options?.onlineOnly === true || !(await canViewInHouseAppointments());

  const today = getLocalDateString();
  const { requireOrganization } = await import("@/lib/auth/organization");
  const { createClient } = await import("@/lib/supabase/server");
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data: pendingDeps } = await supabase
    .from("appointment_deposits")
    .select("appointment_id")
    .eq("organization_id", org.organizationId)
    .eq("status", "PENDING")
    .limit(300);

  const pendingIds = [
    ...new Set((pendingDeps ?? []).map((d) => d.appointment_id).filter(Boolean)),
  ] as string[];

  const [scheduledOnline, pendingRows] = await Promise.all([
    getAppointments(undefined, {
      source: "ONLINE",
      from: addLocalDays(today, -7),
      to: addLocalDays(today, 45),
      statuses: ["SCHEDULED"],
    }),
    pendingIds.length
      ? getAppointments(undefined, {
          appointmentIds: pendingIds,
          excludeStatuses: [...CLOSED_STATUSES],
        })
      : Promise.resolve([] as AppointmentListRow[]),
  ]);

  const byId = new Map<string, AppointmentListRow>();
  for (const row of [...pendingRows, ...scheduledOnline]) {
    if (onlineOnly && row.source === "STAFF") continue;
    byId.set(row.id, row);
  }

  return [...byId.values()].filter((row) => {
    const pending = getPendingDepositTotal(row.deposits ?? []);
    if (pending > 0) return true;
    return (
      (row.source === "ONLINE" || row.source === "CUSTOMER_APP") &&
      row.status === "SCHEDULED"
    );
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
