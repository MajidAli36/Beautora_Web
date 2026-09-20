import {
  getBookingAdvanceSettings,
  getPendingDepositCount,
  getPublicBookingEnabled,
} from "@/lib/actions/appointments";
import {
  fetchAppointmentHistory,
  fetchIncomingAppointments,
  fetchInHouseAppointments,
  fetchOnlineAppointments,
} from "@/lib/actions/online-booking";
import { getOnlineBookingStaff, getStaffSchedulesForOrg } from "@/lib/actions/scheduling";
import {
  AppointmentsHub,
  type AppointmentsTab,
} from "@/components/features/appointments/appointments-hub";
import {
  canAccessFeature,
  canApproveDeposits,
  canConfigureOnlineBooking,
  canOperateQueue,
  canUsePos,
  checkAction,
} from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateString } from "@/lib/dates/local";

type PageProps = {
  searchParams: Promise<{ date?: string; tab?: string; focus?: string }>;
};

function isValidDateParam(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function parseTab(value: string | undefined): AppointmentsTab {
  if (
    value === "online" ||
    value === "incoming" ||
    value === "history" ||
    value === "setup"
  ) {
    return value;
  }
  return "in-house";
}

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dateParam = isValidDateParam(params.date) ? params.date : null;
  const today = getLocalDateString();
  const focus = params.focus === "deposits" ? "deposits" : null;

  const canViewInHouse = await canAccessFeature("appointments");
  const canViewOnline = (await canAccessFeature("online_booking")) || canViewInHouse;

  let initialTab = focus === "deposits" ? "incoming" : parseTab(params.tab);
  if (!canViewInHouse && initialTab === "in-house") initialTab = "online";
  if (!canViewOnline && initialTab === "online") initialTab = canViewInHouse ? "in-house" : "history";
  if (params.tab === "setup") {
    const canConfigureEarly = await canConfigureOnlineBooking();
    if (!canConfigureEarly) initialTab = canViewInHouse ? "in-house" : "online";
  }

  // `date` applies to the active schedule tab (in-house or online), not both blindly.
  const inHouseDate = initialTab === "in-house" ? dateParam ?? today : today;
  const onlineDate =
    initialTab === "online" || initialTab === "history" ? dateParam : null;

  const org = await requireOrganization();
  const supabase = await createClient();
  const { data: orgRow } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", org.organizationId)
    .single();

  const historySource = canViewInHouse ? "ALL" : "ONLINE";

  const emptyAppts = Promise.resolve([] as Awaited<ReturnType<typeof fetchInHouseAppointments>>);

  const [
    inHouse,
    online,
    incoming,
    history,
    staff,
    schedules,
    advanceSettings,
    pendingCount,
    publicBookingEnabled,
    canReviewDeposits,
    canRefund,
    canCheckIn,
    canCollectPayment,
    canConfigure,
    canCreateAppointment,
    canMarkNoShow,
  ] = await Promise.all([
    // Only hydrate the active tab on SSR — hub refetches when switching tabs.
    canViewInHouse && initialTab === "in-house"
      ? fetchInHouseAppointments(inHouseDate).catch(() => [])
      : emptyAppts,
    canViewOnline && initialTab === "online"
      ? fetchOnlineAppointments({ date: onlineDate }).catch(() => [])
      : emptyAppts,
    initialTab === "incoming"
      ? fetchIncomingAppointments({ onlineOnly: !canViewInHouse }).catch(() => [])
      : emptyAppts,
    initialTab === "history"
      ? fetchAppointmentHistory({ date: onlineDate, source: historySource }).catch(() => [])
      : emptyAppts,
    // Staff list is small and used across tabs (booking / filters).
    getOnlineBookingStaff().catch(() => []),
    initialTab === "setup"
      ? getStaffSchedulesForOrg().catch(() => [])
      : Promise.resolve([]),
    getBookingAdvanceSettings().catch(() => null),
    getPendingDepositCount().catch(() => 0),
    getPublicBookingEnabled().catch(() => true),
    canApproveDeposits(),
    checkAction("sales.refund"),
    canOperateQueue(),
    canUsePos(),
    canConfigureOnlineBooking(),
    checkAction("appointments.create"),
    checkAction("appointments.cancel"),
  ]);

  return (
    <AppointmentsHub
      key={`${initialTab}-${inHouseDate}-${onlineDate ?? "all"}-${focus ?? "none"}`}
      initialTab={initialTab}
      inHouseDate={inHouseDate}
      initialOnlineDate={onlineDate}
      initialInHouse={inHouse}
      initialOnline={online}
      initialIncoming={incoming}
      initialHistory={history}
      initialHistorySource={historySource}
      staff={staff}
      schedules={schedules}
      advanceSettings={advanceSettings}
      initialPendingCount={pendingCount}
      publicUrl={`/book/${orgRow?.slug ?? "hair-salon"}`}
      publicBookingEnabled={publicBookingEnabled}
      focus={focus}
      canViewInHouse={canViewInHouse}
      canViewOnline={canViewOnline}
      canConfigure={canConfigure}
      canReviewDeposits={canReviewDeposits}
      canRefundDeposits={canRefund}
      canCollectPayment={canCollectPayment}
      canCheckIn={canCheckIn}
      canCreateAppointment={canCreateAppointment}
      canMarkNoShow={canMarkNoShow}
    />
  );
}
