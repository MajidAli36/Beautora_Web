import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PayrollDashboard } from "@/components/features/payroll/payroll-dashboard";
import { getPayrollDashboard } from "@/lib/actions/payroll-runs";
import { getCapabilities } from "@/lib/auth/permissions";
import { getLocalDateString } from "@/lib/dates/local";

type PageProps = {
  searchParams: Promise<{
    month?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
};

const VIEWS = new Set(["all", "fines", "pending", "paid", "absent", "warnings"]);

export default async function PayrollPage({ searchParams }: PageProps) {
  const [payrollCaps, financesCaps] = await Promise.all([
    getCapabilities("payroll"),
    getCapabilities("finances"),
  ]);
  if (!payrollCaps.visible && !financesCaps.visible) redirect("/dashboard");

  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : getLocalDateString().slice(0, 7);
  const from =
    params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from) ? params.from : undefined;
  const to = params.to && /^\d{4}-\d{2}-\d{2}$/.test(params.to) ? params.to : undefined;
  const viewRaw = params.view ?? "all";
  const initialView = VIEWS.has(viewRaw)
    ? (viewRaw as "all" | "fines" | "pending" | "paid" | "absent" | "warnings")
    : "all";

  const data = await getPayrollDashboard(month, { from, to });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Owner dashboard — pending & paid salary, fines due, absences, warnings, and monthly generate/pay. Filter by date range anytime."
      />
      <PayrollDashboard
        data={data}
        canManage={financesCaps.canCreate}
        initialView={initialView}
      />
    </div>
  );
}
