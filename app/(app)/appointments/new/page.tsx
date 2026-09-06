import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCustomers } from "@/lib/actions/customers";
import { getServices } from "@/lib/actions/services";
import { getStaff } from "@/lib/actions/staff";
import { getStaffSchedulesForOrg } from "@/lib/actions/scheduling";
import { AppointmentForm } from "@/components/features/appointments/appointment-form";
import { StaffScheduleForm } from "@/components/features/staff/staff-schedule-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canConfigureOnlineBooking } from "@/lib/auth/permissions";

export default async function NewAppointmentPage() {
  const [customers, staff, services, schedules, canConfigureHours] = await Promise.all([
    getCustomers(),
    getStaff(),
    getServices(),
    getStaffSchedulesForOrg().catch(() => []),
    canConfigureOnlineBooking(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" render={<Link href="/appointments" />}>
          <ArrowLeft className="size-4" />
          Back to list
        </Button>
      </div>

      <PageHeader
        title="Add appointment"
        description="Book a reception appointment — slots sync with online booking."
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Appointment details</CardTitle>
          <CardDescription>Select customer, staff, time slot, and optional advance payment.</CardDescription>
        </CardHeader>
        <CardContent>
          <AppointmentForm customers={customers} staff={staff} services={services} />
        </CardContent>
      </Card>

      {canConfigureHours && (
        <div className="max-w-3xl">
          <StaffScheduleForm
            staff={staff.map((s) => ({ id: s.id, full_name: s.full_name }))}
            schedules={schedules}
            description="Hours create the Available time list above for reception and online booking."
          />
        </div>
      )}
    </div>
  );
}
