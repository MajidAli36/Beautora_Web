import { Suspense } from "react";
import { getAttendanceOverview, getAttendanceReport } from "@/lib/actions/attendance";
import { listAttendanceDays } from "@/lib/actions/attendance-days";
import { getStaff } from "@/lib/actions/staff";
import { canManageRecords } from "@/lib/auth/permissions";
import { AttendanceDashboard } from "@/components/features/attendance/attendance-dashboard";
import { StaffHolidayForm } from "@/components/features/attendance/staff-holiday-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLocalDateString } from "@/lib/dates/local";

type AttendancePageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    staff?: string;
    view?: string;
  }>;
};

export default async function AttendancePage({ searchParams }: AttendancePageProps) {
  const params = await searchParams;
  const today = getLocalDateString();
  const from = params.from ?? today;
  const to = params.to ?? today;
  const view = params.view ?? (from === to ? "daily" : "range");

  const [report, overview, staffList, canManage, holidayDays] = await Promise.all([
    getAttendanceReport(from, to, params.staff || undefined),
    getAttendanceOverview(),
    getStaff(),
    canManageRecords(),
    listAttendanceDays({ from, to, limit: 40 }).catch(() => []),
  ]);

  const activeStaff = staffList
    .filter((s) => s.is_active !== false)
    .map((s) => ({
      id: s.id,
      full_name: s.full_name,
      thumb_id: (s as { thumb_id?: string | null }).thumb_id ?? null,
      thumb_enrolled_at:
        (s as { thumb_enrolled_at?: string | null }).thumb_enrolled_at ?? null,
    }));

  return (
    <div className="min-h-0 space-y-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <AttendanceDashboard
          report={report}
          overview={overview}
          staffList={activeStaff}
          canManage={canManage}
          from={from}
          to={to}
          view={view}
        />
      </Suspense>
      {canManage ? (
        <Card id="holidays-leave" className="mx-auto max-w-4xl overflow-visible">
          <CardHeader>
            <CardTitle>Holidays & leave</CardTitle>
            <CardDescription>
              Assign a paid holiday (national / salon) or unpaid leave for one staff
              member or all active staff. Same section as Staff → Holidays & leave.
              Weekly offs are set on each profile under Salary & duty.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-visible">
            <StaffHolidayForm
              staffList={activeStaff.map((s) => ({
                id: s.id,
                full_name: s.full_name,
              }))}
              defaultStaffId={params.staff || undefined}
              recentDays={holidayDays}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
