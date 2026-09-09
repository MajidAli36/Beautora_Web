import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getAppointments } from "@/lib/actions/appointments";
import { getStaff } from "@/lib/actions/staff";
import { getStaffSchedulesForOrg } from "@/lib/actions/scheduling";
import { AppointmentsScheduleTable } from "@/components/features/appointments/appointments-schedule-table";
import { StaffScheduleForm } from "@/components/features/staff/staff-schedule-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApprovedDepositTotal, getPendingDepositTotal, sumServicePrices } from "@/lib/booking/pricing";
import { formatCurrency, formatDate } from "@/lib/format";
import { getLocalDateString } from "@/lib/dates/local";
import {
  canApproveDeposits,
  canConfigureOnlineBooking,
  canOperateQueue,
  canUsePos,
  checkAction,
} from "@/lib/auth/permissions";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function AppointmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date ?? getLocalDateString();
  const [
    appointments,
    canReviewDeposits,
    canRefund,
    canCheckIn,
    canCollectPayment,
    canConfigureHours,
    canCreateAppointment,
    staff,
    schedules,
  ] = await Promise.all([
    getAppointments(date, { source: "STAFF" }),
    canApproveDeposits(),
    checkAction("sales.refund"),
    canOperateQueue(),
    canUsePos(),
    canConfigureOnlineBooking(),
    checkAction("appointments.create"),
    getStaff().catch(() => []),
    getStaffSchedulesForOrg().catch(() => []),
  ]);

  const formattedDate = formatDate(`${date}T12:00:00+05:00`, "long");

  const totalServices = appointments.reduce(
    (sum, a) => sum + sumServicePrices(a.services ?? []),
    0
  );
  const totalAdvance = appointments.reduce(
    (sum, a) => sum + getApprovedDepositTotal(a.deposits ?? []),
    0
  );
  const pendingCount = appointments.filter(
    (a) => getPendingDepositTotal(a.deposits ?? []) > 0
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description={`Reception schedule for ${formattedDate} — services, advances, and balances.`}
        actions={
          <>
            <Button variant="outline" render={<Link href="/online-booking" />}>
              Online booking
            </Button>
            {canCreateAppointment && (
              <Button render={<Link href="/appointments/new" />}>
                <Plus className="size-4" />
                Add appointment
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Appointments</p>
            <p className="text-3xl font-bold">{appointments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Services value</p>
            <p className="text-3xl font-bold">{formatCurrency(totalServices)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Advances collected{pendingCount > 0 ? ` · ${pendingCount} pending approval` : ""}
            </p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(totalAdvance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Checked in</p>
            <p className="text-3xl font-bold">
              {appointments.filter((a) => a.status === "CHECKED_IN").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Schedule</CardTitle>
          <form className="flex items-end gap-2" action="/appointments" method="get">
            <div className="space-y-1">
              <Label htmlFor="date" className="text-xs">
                Date
              </Label>
              <Input id="date" name="date" type="date" defaultValue={date} className="h-10 w-full min-w-[9.5rem] sm:h-8 sm:w-40" />
            </div>
            <Button type="submit" size="sm" variant="outline">
              View
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <AppointmentsScheduleTable
            appointments={appointments}
            mode="staff"
            emptyMessage="No reception appointments on this date."
            emptyAction={{ label: "Add appointment", href: "/appointments/new" }}
            canReviewDeposits={canReviewDeposits}
            canRefundDeposits={canRefund}
            canCheckIn={canCheckIn}
            canCollectPayment={canCollectPayment}
          />
        </CardContent>
      </Card>

      {canConfigureHours && (
        <StaffScheduleForm
          staff={staff.map((s) => ({ id: s.id, full_name: s.full_name }))}
          schedules={schedules}
        />
      )}
    </div>
  );
}
