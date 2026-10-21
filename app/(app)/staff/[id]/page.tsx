import { notFound, redirect } from "next/navigation";
import { getStaffMonthlyDetail } from "@/lib/actions/reports";
import { getStaffCompensation } from "@/lib/actions/payroll-runs";
import { getStaffPayslipBundle } from "@/lib/actions/staff-payslip";
import { StaffMonthlyDetailView } from "@/components/features/staff/staff-monthly-detail";
import { StaffCompensationForm } from "@/components/features/payroll/staff-compensation-form";
import { StaffPayslipInvoice } from "@/components/features/payroll/staff-payslip-invoice";
import { getLocalDateString } from "@/lib/dates/local";
import { canManageRecords, canAccessFeature } from "@/lib/auth/permissions";
import { getLinkedStaffProfile } from "@/lib/staff/linked-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type StaffDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
};

export default async function StaffDetailPage({
  params,
  searchParams,
}: StaffDetailPageProps) {
  const { id } = await params;
  const { month } = await searchParams;
  const yearMonth =
    month && /^\d{4}-\d{2}$/.test(month) ? month : getLocalDateString().slice(0, 7);

  const [canBrowseStaff, linked] = await Promise.all([
    canAccessFeature("staff"),
    getLinkedStaffProfile(),
  ]);

  const isOwn = linked?.id === id;
  if (!canBrowseStaff && !isOwn) {
    if (linked) redirect(`/staff/${linked.id}`);
    notFound();
  }

  const [data, canManage] = await Promise.all([
    getStaffMonthlyDetail(id, yearMonth),
    canManageRecords(),
  ]);
  if (!data) notFound();

  const showSalaryEdit = canManage && canBrowseStaff;
  const [compensation, payslip] = await Promise.all([
    showSalaryEdit
      ? getStaffCompensation(id).catch(() => null)
      : Promise.resolve(null),
    getStaffPayslipBundle(id, yearMonth).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      {payslip ? (
        <div className="mx-auto max-w-4xl space-y-2">
          <p className="text-sm text-muted-foreground px-1">
            {payslip.isSelfView
              ? "Your salary invoice — pay rate, duty time, bonuses, advances, fines, and net pay."
              : "Staff salary invoice — same view the employee sees on their login."}
          </p>
          <StaffPayslipInvoice bundle={payslip} staffName={data.name} />
        </div>
      ) : null}
      <StaffMonthlyDetailView
        data={data}
        canManage={showSalaryEdit}
        canBrowseStaff={canBrowseStaff}
      />
      {showSalaryEdit && compensation ? (
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <CardTitle>Salary & duty configuration</CardTitle>
            <CardDescription>
              Monthly or hourly pay, personal duty start/end (overrides salon default),
              breaks, overtime, and weekly offs. Late grace/fines are set under Settings →
              Attendance & late.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StaffCompensationForm staff={compensation} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
