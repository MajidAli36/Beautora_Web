"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { AppointmentsScheduleTable } from "@/components/features/appointments/appointments-schedule-table";
import { BookingAdvanceSettings } from "@/components/features/online-booking/booking-advance-settings";
import { PublicBookingToggle } from "@/components/features/online-booking/public-booking-toggle";
import { StaffOnlineToggle } from "@/components/features/online-booking/staff-online-toggle";
import { StaffScheduleForm } from "@/components/features/staff/staff-schedule-form";
import {
  fetchAppointmentHistory,
  fetchIncomingAppointments,
  fetchInHouseAppointments,
  fetchOnlineAppointments,
  type AppointmentListRow,
} from "@/lib/actions/online-booking";
import { getApprovedDepositTotal, getPendingDepositTotal, sumServicePrices } from "@/lib/booking/pricing";
import { DAY_NAMES } from "@/lib/booking/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLocalDateString } from "@/lib/dates/local";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type AppointmentsTab = "in-house" | "online" | "incoming" | "history" | "setup";

type StaffRow = {
  id: string;
  full_name: string;
  job_title: string | null;
  online_booking_enabled: boolean;
};

type StaffScheduleRow = {
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AdvanceSettings = {
  booking_advance_amount: number;
  booking_advance_percent: number;
  booking_payment_instructions: string | null;
} | null;

type AppointmentsHubProps = {
  initialTab: AppointmentsTab;
  inHouseDate: string;
  /** When set (from `?date=` on online/history), seed that tab's day filter. */
  initialOnlineDate?: string | null;
  initialInHouse: AppointmentListRow[];
  initialOnline: AppointmentListRow[];
  initialIncoming: AppointmentListRow[];
  initialHistory: AppointmentListRow[];
  initialHistorySource?: "ALL" | "ONLINE" | "STAFF";
  staff: StaffRow[];
  schedules: StaffScheduleRow[];
  advanceSettings: AdvanceSettings;
  initialPendingCount: number;
  publicUrl: string;
  publicBookingEnabled?: boolean;
  focus?: "deposits" | null;
  canViewInHouse?: boolean;
  canViewOnline?: boolean;
  canConfigure?: boolean;
  canReviewDeposits?: boolean;
  canRefundDeposits?: boolean;
  canCollectPayment?: boolean;
  canCheckIn?: boolean;
  canCreateAppointment?: boolean;
  canMarkNoShow?: boolean;
};

function syncUrl(tab: AppointmentsTab, date: string | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (tab === "in-house") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  if (date) url.searchParams.set("date", date);
  else if (tab !== "in-house") url.searchParams.delete("date");
  const qs = url.searchParams.toString();
  window.history.replaceState(null, "", qs ? `${url.pathname}?${qs}` : url.pathname);
}

function formatWeekHours(schedules: StaffScheduleRow[], staffId: string): string {
  const rows = schedules
    .filter((s) => s.staff_id === staffId)
    .sort((a, b) => a.day_of_week - b.day_of_week);
  if (!rows.length) return "";
  return rows
    .map(
      (r) =>
        `${DAY_NAMES[r.day_of_week]?.slice(0, 3) ?? r.day_of_week} ${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`
    )
    .join(" · ");
}

export function AppointmentsHub({
  initialTab,
  inHouseDate: initialInHouseDate,
  initialOnlineDate = null,
  initialInHouse,
  initialOnline,
  initialIncoming,
  initialHistory,
  initialHistorySource = "ALL",
  staff: initialStaff,
  schedules,
  advanceSettings,
  initialPendingCount,
  publicUrl,
  publicBookingEnabled = true,
  focus = null,
  canViewInHouse = true,
  canViewOnline = true,
  canConfigure = false,
  canReviewDeposits = false,
  canRefundDeposits = false,
  canCollectPayment = false,
  canCheckIn = false,
  canCreateAppointment = false,
  canMarkNoShow = false,
}: AppointmentsHubProps) {
  const [tab, setTab] = useState<AppointmentsTab>(initialTab);
  const [inHouseDate, setInHouseDate] = useState(initialInHouseDate);
  const [onlineDate, setOnlineDate] = useState<string | null>(
    initialTab === "online" ? initialOnlineDate : null
  );
  const [historyDate, setHistoryDate] = useState<string | null>(
    initialTab === "history" ? initialOnlineDate : null
  );
  const [historySource, setHistorySource] = useState<"ALL" | "ONLINE" | "STAFF">(
    canViewInHouse ? initialHistorySource : "ONLINE"
  );

  const [inHouse, setInHouse] = useState(initialInHouse);
  const [online, setOnline] = useState(initialOnline);
  const [incoming, setIncoming] = useState(initialIncoming);
  const [history, setHistory] = useState(initialHistory);
  const [staff, setStaff] = useState(initialStaff);
  const [pendingCount, setPendingCount] = useState(initialPendingCount);

  const [loadingInHouse, startInHouse] = useTransition();
  const [loadingOnline, startOnline] = useTransition();
  const [loadingIncoming, startIncoming] = useTransition();
  const [loadingHistory, startHistory] = useTransition();

  const sectionRef = useRef<HTMLDivElement>(null);
  const onlineOnly = !canViewInHouse;

  const loadInHouse = useCallback((date: string) => {
    if (!canViewInHouse) return;
    startInHouse(async () => {
      try {
        setInHouse(await fetchInHouseAppointments(date));
      } catch {
        /* keep */
      }
    });
  }, [canViewInHouse]);

  const loadOnline = useCallback((date: string | null) => {
    startOnline(async () => {
      try {
        setOnline(await fetchOnlineAppointments({ date }));
      } catch {
        /* keep */
      }
    });
  }, []);

  const loadIncoming = useCallback(() => {
    startIncoming(async () => {
      try {
        setIncoming(await fetchIncomingAppointments({ onlineOnly }));
      } catch {
        /* keep */
      }
    });
  }, [onlineOnly]);

  const loadHistory = useCallback((date: string | null, source: "ALL" | "ONLINE" | "STAFF") => {
    startHistory(async () => {
      try {
        setHistory(
          await fetchAppointmentHistory({
            date,
            source: onlineOnly ? "ONLINE" : source,
          })
        );
      } catch {
        /* keep */
      }
    });
  }, [onlineOnly]);

  useEffect(() => {
    if (focus !== "deposits") return;
    setTab("incoming");
    const node = sectionRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focus]);

  function selectTab(next: string) {
    const value = next as AppointmentsTab;
    if (value === "in-house" && !canViewInHouse) return;
    if (value === "online" && !canViewOnline) return;
    if (value === "setup" && !canConfigure) return;
    setTab(value);
    const dateForUrl =
      value === "in-house"
        ? inHouseDate
        : value === "online"
          ? onlineDate
          : value === "history"
            ? historyDate
            : null;
    syncUrl(value, dateForUrl);
    if (value === "incoming") loadIncoming();
    if (value === "history") loadHistory(historyDate, historySource);
    if (value === "online") loadOnline(onlineDate);
  }

  function removeFromOpenLists(appointmentId: string) {
    setInHouse((prev) => prev.filter((a) => a.id !== appointmentId));
    setOnline((prev) => prev.filter((a) => a.id !== appointmentId));
    setIncoming((prev) => prev.filter((a) => a.id !== appointmentId));
    loadHistory(historyDate, historySource);
  }

  function handleDepositResolved(
    appointmentId: string,
    depositId: string,
    status: "APPROVED" | "REJECTED" | "REFUNDED"
  ) {
    if (status === "REJECTED") {
      removeFromOpenLists(appointmentId);
      setPendingCount((c) => Math.max(0, c - 1));
      return;
    }

    const patch = (rows: AppointmentListRow[]) =>
      rows.map((a) => {
        if (a.id !== appointmentId) return a;
        const deposits = a.deposits.map((d) =>
          d.id === depositId ? { ...d, status } : d
        );
        const nextStatus =
          status === "APPROVED"
            ? "CONFIRMED"
            : status === "REFUNDED" &&
                advanceSettings &&
                (advanceSettings.booking_advance_amount > 0 ||
                  advanceSettings.booking_advance_percent > 0)
              ? "SCHEDULED"
              : a.status;
        return { ...a, status: nextStatus, deposits };
      });

    setInHouse(patch);
    setOnline(patch);
    setIncoming((prev) => {
      const next = patch(prev);
      return next.filter((row) => {
        const pending = getPendingDepositTotal(row.deposits ?? []);
        return pending > 0 || (row.source === "ONLINE" && row.status === "SCHEDULED");
      });
    });
    if (status === "APPROVED") setPendingCount((c) => Math.max(0, c - 1));
  }

  const bookableStaff = useMemo(() => {
    return staff
      .filter((s) => s.online_booking_enabled)
      .map((s) => ({
        ...s,
        weekHours: formatWeekHours(schedules, s.id) || null,
      }));
  }, [staff, schedules]);

  const inHouseStats = useMemo(() => {
    const totalServices = inHouse.reduce((sum, a) => sum + sumServicePrices(a.services ?? []), 0);
    const totalAdvance = inHouse.reduce(
      (sum, a) => sum + getApprovedDepositTotal(a.deposits ?? []),
      0
    );
    const pending = inHouse.filter((a) => getPendingDepositTotal(a.deposits ?? []) > 0).length;
    const checkedIn = inHouse.filter((a) => a.status === "CHECKED_IN").length;
    return { totalServices, totalAdvance, pending, checkedIn };
  }, [inHouse]);

  const formattedInHouseDate = formatDate(`${inHouseDate}T12:00:00+05:00`, "long");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description="In-house, online, incoming advances, and full history — one place to manage every booking."
        actions={
          <>
            {pendingCount > 0 && (
              <Button
                type="button"
                variant="outline"
                className="border-amber-500/40"
                onClick={() => selectTab("incoming")}
              >
                <Badge className="mr-2 bg-amber-600">{pendingCount}</Badge>
                Advances waiting
              </Button>
            )}
            <Button variant="outline" render={<Link href={publicUrl} target="_blank" />}>
              Public booking page
            </Button>
            {canCreateAppointment && canViewInHouse && (
              <Button render={<Link href="/appointments/new" />}>
                <Plus className="size-4" />
                Add in-house
              </Button>
            )}
          </>
        }
      />

      <div ref={sectionRef} className="scroll-mt-24">
        <Tabs value={tab} onValueChange={selectTab} className="space-y-4">
          <TabsList className="flex h-auto flex-wrap gap-1">
            {canViewInHouse ? <TabsTrigger value="in-house">In-house</TabsTrigger> : null}
            {canViewOnline ? <TabsTrigger value="online">Online</TabsTrigger> : null}
            <TabsTrigger value="incoming">
              Incoming
              {incoming.length > 0 ? (
                <Badge className="ml-1.5 bg-amber-600 px-1.5 py-0 text-[10px]">
                  {incoming.length}
                </Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            {canConfigure ? <TabsTrigger value="setup">Booking setup</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="in-house" className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Open today</p>
                  <p className="text-3xl font-bold">{inHouse.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Services value</p>
                  <p className="break-words text-3xl font-bold tabular-nums">
                    {formatCurrency(inHouseStats.totalServices)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">
                    Advances
                    {inHouseStats.pending > 0 ? ` · ${inHouseStats.pending} pending` : ""}
                  </p>
                  <p className="break-words text-3xl font-bold tabular-nums text-primary">
                    {formatCurrency(inHouseStats.totalAdvance)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Checked in</p>
                  <p className="text-3xl font-bold">{inHouseStats.checkedIn}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>In-house schedule</CardTitle>
                  <CardDescription>
                    Reception bookings for {formattedInHouseDate}. Mark no-show if they never arrive,
                    or open POS to bill and complete.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="ih-date" className="text-xs">
                      Date
                    </Label>
                    <Input
                      id="ih-date"
                      type="date"
                      value={inHouseDate}
                      className="h-8 w-40"
                      onChange={(e) => {
                        const next = e.target.value || getLocalDateString();
                        setInHouseDate(next);
                        syncUrl("in-house", next);
                        loadInHouse(next);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loadingInHouse}
                    onClick={() => loadInHouse(inHouseDate)}
                  >
                    {loadingInHouse ? "Loading…" : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingInHouse ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <AppointmentsScheduleTable
                    appointments={inHouse}
                    mode="staff"
                    advanceSettings={advanceSettings ?? undefined}
                    emptyMessage="No open in-house appointments on this date."
                    emptyAction={
                      canCreateAppointment
                        ? { label: "Add appointment", href: "/appointments/new" }
                        : undefined
                    }
                    onDepositResolved={handleDepositResolved}
                    onAppointmentCancelled={removeFromOpenLists}
                    onAppointmentNoShow={removeFromOpenLists}
                    canReviewDeposits={canReviewDeposits}
                    canRefundDeposits={canRefundDeposits}
                    canCancelOnline={false}
                    canMarkNoShow={canMarkNoShow}
                    canCheckIn={canCheckIn}
                    canCollectPayment={canCollectPayment}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="online">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Online appointments</CardTitle>
                  <CardDescription>
                    Public bookings still open. After POS checkout they move to History as Completed.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={onlineDate === null ? "default" : "outline"}
                    disabled={loadingOnline}
                    onClick={() => {
                      setOnlineDate(null);
                      syncUrl("online", null);
                      loadOnline(null);
                    }}
                  >
                    All open
                  </Button>
                  <div className="space-y-1">
                    <Label htmlFor="ol-date" className="text-xs">
                      Filter day
                    </Label>
                    <Input
                      id="ol-date"
                      type="date"
                      value={onlineDate ?? ""}
                      className="h-8 w-40"
                      onChange={(e) => {
                        const next = e.target.value || null;
                        setOnlineDate(next);
                        syncUrl("online", next);
                        loadOnline(next);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loadingOnline}
                    onClick={() => loadOnline(onlineDate)}
                  >
                    {loadingOnline ? "Loading…" : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingOnline ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <AppointmentsScheduleTable
                    appointments={online}
                    mode="online"
                    showDateTime
                    advanceSettings={advanceSettings ?? undefined}
                    emptyMessage={
                      onlineDate
                        ? "No open online appointments on this date."
                        : "No open online appointments right now."
                    }
                    onDepositResolved={handleDepositResolved}
                    onAppointmentCancelled={removeFromOpenLists}
                    onAppointmentNoShow={removeFromOpenLists}
                    canReviewDeposits={canReviewDeposits}
                    canRefundDeposits={canRefundDeposits}
                    canCancelOnline={canReviewDeposits}
                    canMarkNoShow={canMarkNoShow}
                    canCollectPayment={canCollectPayment}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incoming">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>Incoming — needs attention</CardTitle>
                  <CardDescription>
                    Pending advances and new online bookings waiting for confirmation. Approve,
                    cancel, mark no-show, or bill at POS.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loadingIncoming}
                  onClick={loadIncoming}
                >
                  {loadingIncoming ? "Loading…" : "Refresh"}
                </Button>
              </CardHeader>
              <CardContent>
                {loadingIncoming ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <AppointmentsScheduleTable
                    appointments={incoming}
                    mode="online"
                    showDateTime
                    advanceSettings={advanceSettings ?? undefined}
                    emptyMessage="Nothing waiting — no pending advances or new online bookings."
                    onDepositResolved={handleDepositResolved}
                    onAppointmentCancelled={removeFromOpenLists}
                    onAppointmentNoShow={removeFromOpenLists}
                    canReviewDeposits={canReviewDeposits}
                    canRefundDeposits={canRefundDeposits}
                    canCancelOnline={canReviewDeposits}
                    canMarkNoShow={canMarkNoShow}
                    canCheckIn={canCheckIn}
                    canCollectPayment={canCollectPayment}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>History — closed appointments</CardTitle>
                  <CardDescription>
                    {canViewInHouse
                      ? "Completed (billed), no-shows (booked but never came), and cancelled — online and in-house, any date."
                      : "Completed, no-shows, and cancelled online bookings."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  {canViewInHouse ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Source</Label>
                      <div className="flex gap-1">
                        {(["ALL", "ONLINE", "STAFF"] as const).map((s) => (
                          <Button
                            key={s}
                            type="button"
                            size="sm"
                            variant={historySource === s ? "default" : "outline"}
                            onClick={() => {
                              setHistorySource(s);
                              loadHistory(historyDate, s);
                            }}
                          >
                            {s === "ALL" ? "All" : s === "ONLINE" ? "Online" : "In-house"}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={historyDate === null ? "default" : "outline"}
                    onClick={() => {
                      setHistoryDate(null);
                      syncUrl("history", null);
                      loadHistory(null, historySource);
                    }}
                  >
                    All dates
                  </Button>
                  <div className="space-y-1">
                    <Label htmlFor="hi-date" className="text-xs">
                      Filter day
                    </Label>
                    <Input
                      id="hi-date"
                      type="date"
                      value={historyDate ?? ""}
                      className="h-8 w-40"
                      onChange={(e) => {
                        const next = e.target.value || null;
                        setHistoryDate(next);
                        syncUrl("history", next);
                        loadHistory(next, historySource);
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={loadingHistory}
                    onClick={() => loadHistory(historyDate, historySource)}
                  >
                    {loadingHistory ? "Loading…" : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <Skeleton className="h-28 w-full rounded-xl" />
                ) : (
                  <AppointmentsScheduleTable
                    appointments={history}
                    mode="online"
                    showDateTime
                    historyMode
                    advanceSettings={advanceSettings ?? undefined}
                    emptyMessage="No history yet for this filter."
                    canReviewDeposits={false}
                    canRefundDeposits={canRefundDeposits}
                    canCancelOnline={false}
                    canMarkNoShow={false}
                    canCollectPayment={false}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {canConfigure ? (
            <TabsContent value="setup" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Booking setup</h2>
                  <p className="text-sm text-muted-foreground">
                    Public page, advances, which stylists appear online, and shared weekly hours.
                  </p>
                </div>
                <PublicBookingToggle enabled={publicBookingEnabled} canManage={canConfigure} />
              </div>

              <BookingAdvanceSettings settings={advanceSettings} />

              <Card>
                <CardHeader>
                  <CardTitle>Staff on public booking</CardTitle>
                  <CardDescription>
                    Enable stylists for the public booking page. Hours below apply to both reception
                    and online — shared calendar, no double booking.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StaffOnlineToggle staff={staff} onStaffChange={setStaff} />
                </CardContent>
              </Card>

              <StaffScheduleForm
                staff={staff.map((s) => ({ id: s.id, full_name: s.full_name }))}
                schedules={schedules}
                title="Staff schedules"
                description="Weekly hours for reception and online bookings."
              />

              {bookableStaff.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Bookable staff snapshot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Weekly hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookableStaff.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.full_name}</TableCell>
                              <TableCell>{s.job_title ?? "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {s.weekHours ?? "No hours set"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </div>
  );
}
