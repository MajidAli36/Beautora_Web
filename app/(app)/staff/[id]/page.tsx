import { notFound, redirect } from "next/navigation";
import { getStaffMonthlyDetail } from "@/lib/actions/reports";
import { StaffMonthlyDetailView } from "@/components/features/staff/staff-monthly-detail";
import { getLocalDateString } from "@/lib/dates/local";
import { canManageRecords, canAccessFeature } from "@/lib/auth/permissions";
import { getLinkedStaffProfile } from "@/lib/staff/linked-profile";

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

  return (
    <StaffMonthlyDetailView
      data={data}
      canManage={canManage && canBrowseStaff}
      canBrowseStaff={canBrowseStaff}
    />
  );
}
