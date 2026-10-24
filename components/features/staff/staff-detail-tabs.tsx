"use client";

import Link from "next/link";
import type { StaffMonthlyDetail } from "@/lib/actions/reports";
import type { StaffPayslipBundle } from "@/lib/actions/staff-payslip";
import { StaffMonthlyDetailView } from "@/components/features/staff/staff-monthly-detail";
import { StaffPayslipInvoice } from "@/components/features/payroll/staff-payslip-invoice";
import { StaffCompensationForm } from "@/components/features/payroll/staff-compensation-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type CompensationStaff = NonNullable<
  Parameters<typeof StaffCompensationForm>[0]["staff"]
>;

type StaffDetailTabsProps = {
  data: StaffMonthlyDetail;
  canManage: boolean;
  canBrowseStaff: boolean;
  payslip: StaffPayslipBundle | null;
  compensation: CompensationStaff | null;
};

export function StaffDetailTabs({
  data,
  canManage,
  canBrowseStaff,
  payslip,
  compensation,
}: StaffDetailTabsProps) {
  const showSalary = canManage && compensation;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <StaffMonthlyDetailView
        data={data}
        canManage={canManage}
        canBrowseStaff={canBrowseStaff}
        sections={["header"]}
      />

      <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {payslip ? <TabsTrigger value="payslip">Payslip</TabsTrigger> : null}
        <TabsTrigger value="appointments">Appointments</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="conduct">Conduct</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        {showSalary ? <TabsTrigger value="salary">Pay setup</TabsTrigger> : null}
      </TabsList>

      <TabsContent value="overview" className="space-y-4 outline-none">
        <StaffMonthlyDetailView
          data={data}
          canManage={canManage}
          canBrowseStaff={canBrowseStaff}
          sections={["stats"]}
        />
      </TabsContent>

      {payslip ? (
        <TabsContent value="payslip" className="space-y-2 outline-none">
          <p className="px-1 text-sm text-muted-foreground">
            {payslip.isSelfView
              ? "Your salary invoice — pay rate, duty time, bonuses, advances, fines, and net pay."
              : "Staff salary invoice — same view the employee sees on their login."}
          </p>
          <StaffPayslipInvoice bundle={payslip} staffName={data.name} />
        </TabsContent>
      ) : null}

      <TabsContent value="appointments" className="outline-none">
        <StaffMonthlyDetailView
          data={data}
          canManage={canManage}
          canBrowseStaff={canBrowseStaff}
          sections={["appointments"]}
        />
      </TabsContent>

      <TabsContent value="attendance" className="outline-none">
        <StaffMonthlyDetailView
          data={data}
          canManage={canManage}
          canBrowseStaff={canBrowseStaff}
          sections={["attendance"]}
        />
      </TabsContent>

      <TabsContent value="conduct" className="outline-none">
        <StaffMonthlyDetailView
          data={data}
          canManage={canManage}
          canBrowseStaff={canBrowseStaff}
          sections={["conduct"]}
        />
      </TabsContent>

      <TabsContent value="payments" className="outline-none">
        <StaffMonthlyDetailView
          data={data}
          canManage={canManage}
          canBrowseStaff={canBrowseStaff}
          sections={["payments"]}
        />
      </TabsContent>

      {showSalary && compensation ? (
        <TabsContent value="salary" className="outline-none">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>Salary & duty configuration</CardTitle>
              <CardDescription>
                Monthly or hourly pay, personal duty start/end (overrides salon default),
                breaks, overtime, and weekly offs. Late grace/fines are set under Settings →
                Attendance & late. One-off holidays and leave are managed on{" "}
                <Link
                  href="/staff#holidays-leave"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Staff → Holidays & leave
                </Link>{" "}
                or Attendance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StaffCompensationForm staff={compensation} />
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}
      </Tabs>
    </div>
  );
}
