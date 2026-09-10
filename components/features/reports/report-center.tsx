"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Printer, RefreshCw, Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EXPORT_FORMAT_OPTIONS,
  downloadExportDocument,
  type ExportFormat,
} from "@/lib/reports/export-formats";
import { buildReportExportDocument } from "@/lib/reports/build-report-export";
import {
  getOverallReport,
  getSalesReport,
  getServicesReport,
  getCustomersReport,
  getAppointmentsReport,
  getStaffReport,
  getInventoryReport,
  getInHouseUsageReport,
  getProductsReport,
  getFinanceReport,
  getPaymentsReport,
  getDuesReport,
  type OverallReport,
  type SalesReport,
  type ServicesReport,
  type CustomersReport,
  type AppointmentsReport,
  type StaffReport,
  type InventoryReport,
  type InHouseUsageReport,
  type ProductsReport,
  type FinanceReport,
  type PaymentsReport,
  type DuesReport,
} from "@/lib/actions/reports";
import {
  REPORT_TABS,
  getReportPeriodRange,
  isReportTabId,
  type ReportPeriodPreset,
  type ReportTabId,
} from "@/lib/reports/range";
import { getLocalDateString } from "@/lib/dates/local";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportError, ReportLoading } from "@/components/features/reports/ui/report-states";
import { OverallTab } from "@/components/features/reports/tabs/overall-tab";
import { SalesTab } from "@/components/features/reports/tabs/sales-tab";
import { ServicesTab } from "@/components/features/reports/tabs/services-tab";
import { CustomersTab } from "@/components/features/reports/tabs/customers-tab";
import { AppointmentsTab } from "@/components/features/reports/tabs/appointments-tab";
import { StaffTab } from "@/components/features/reports/tabs/staff-tab";
import { InventoryTab } from "@/components/features/reports/tabs/inventory-tab";
import { InHouseUsageTab } from "@/components/features/reports/tabs/in-house-usage-tab";
import { ProductsTab } from "@/components/features/reports/tabs/products-tab";
import { FinanceTab } from "@/components/features/reports/tabs/finance-tab";
import { PaymentsTab } from "@/components/features/reports/tabs/payments-tab";
import { DuesTab } from "@/components/features/reports/tabs/dues-tab";

const PRESETS: { id: ReportPeriodPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This week" },
  { id: "last_week", label: "Last week" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "this_year", label: "This year" },
];

type TabDataMap = {
  overall: OverallReport;
  sales: SalesReport;
  services: ServicesReport;
  customers: CustomersReport;
  appointments: AppointmentsReport;
  staff: StaffReport;
  inventory: InventoryReport;
  in_house: InHouseUsageReport;
  products: ProductsReport;
  finance: FinanceReport;
  payments: PaymentsReport;
  dues: DuesReport;
};

type ReportCenterProps = {
  initialFrom: string;
  initialTo: string;
  initialTab: ReportTabId;
};

export function ReportCenter({ initialFrom, initialTo, initialTab }: ReportCenterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const from = searchParams.get("from") ?? initialFrom;
  const to = searchParams.get("to") ?? initialTo;
  const tabParam = searchParams.get("tab");
  const tab: ReportTabId = isReportTabId(tabParam) ? tabParam : initialTab;

  const [cache, setCache] = useState<Partial<TabDataMap>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const pushState = useCallback(
    (next: { from?: string; to?: string; tab?: ReportTabId }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.from) params.set("from", next.from);
      if (next.to) params.set("to", next.to);
      if (next.tab) params.set("tab", next.tab);
      startTransition(() => router.push(`/reports?${params.toString()}`));
    },
    [router, searchParams, startTransition]
  );

  const loadTab = useCallback(
    async (active: ReportTabId, rangeFrom: string, rangeTo: string, force = false) => {
      setLoading(true);
      setError(null);
      try {
        if (!force) {
          // keep showing prior data while refetching same tab is handled below
        }
        const loaders: { [K in ReportTabId]: () => Promise<TabDataMap[K]> } = {
          overall: () => getOverallReport(rangeFrom, rangeTo),
          sales: () => getSalesReport(rangeFrom, rangeTo),
          services: () => getServicesReport(rangeFrom, rangeTo),
          customers: () => getCustomersReport(rangeFrom, rangeTo),
          appointments: () => getAppointmentsReport(rangeFrom, rangeTo),
          staff: () => getStaffReport(rangeFrom, rangeTo),
          inventory: () => getInventoryReport(rangeFrom, rangeTo),
          in_house: () => getInHouseUsageReport(rangeFrom, rangeTo),
          products: () => getProductsReport(rangeFrom, rangeTo),
          finance: () => getFinanceReport(rangeFrom, rangeTo),
          payments: () => getPaymentsReport(rangeFrom, rangeTo),
          dues: () => getDuesReport(rangeFrom, rangeTo),
        };
        const data = await loaders[active]();
        setCache((prev) => ({ ...prev, [active]: data }));
        setUpdatedAt(new Date().toISOString());
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadTab(tab, from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when tab/range changes
  }, [tab, from, to]);

  function applyPreset(preset: ReportPeriodPreset) {
    const range = getReportPeriodRange(preset);
    setCache({});
    pushState({ from: range.from, to: range.to });
  }

  function applyCustom(nextFrom: string, nextTo: string) {
    setCache({});
    pushState({ from: nextFrom, to: nextTo });
  }

  const [exporting, setExporting] = useState(false);

  async function handleExport(format: ExportFormat) {
    const data = cache[tab];
    if (!data || exporting) return;
    setExporting(true);
    try {
      const doc = buildReportExportDocument(tab, data);
      await downloadExportDocument(doc, format);
      toast.success(`Downloaded ${format.toUpperCase()} export`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed";
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }

  const today = getLocalDateString();
  const activePreset = PRESETS.find((p) => {
    const r = getReportPeriodRange(p.id);
    return r.from === from && r.to === to;
  })?.id;

  return (
    <div className="space-y-5 print:space-y-3">
      <PageHeader
        className="print:hidden"
        title="Reports"
        description="Business analytics, sales, services, customers, inventory and financial performance."
        actions={
          <>
            <Button type="button" size="sm" variant="outline" disabled={loading || pending} onClick={() => void loadTab(tab, from, to, true)}>
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={!cache[tab] || exporting}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Download className="size-3.5" />
                {exporting ? "Exporting…" : "Export"}
                <ChevronDown className="size-3.5 opacity-70" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Download as</DropdownMenuLabel>
                  {EXPORT_FORMAT_OPTIONS.map((opt) => (
                    <DropdownMenuItem
                      key={opt.id}
                      disabled={exporting}
                      onClick={() => void handleExport(opt.id)}
                    >
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="size-3.5" />
              Print
            </Button>
          </>
        }
      />

      <div className="rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4 print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-4 print:hidden">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                className={cn(
                  "min-h-10 sm:min-h-0",
                  activePreset === p.id && "border-primary bg-accent text-accent-foreground"
                )}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="rep-from" className="text-xs">From</Label>
              <Input
                id="rep-from"
                type="date"
                value={from}
                className="h-10 w-full min-w-[9.5rem] sm:h-8 sm:w-36"
                onChange={(e) => applyCustom(e.target.value, to)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rep-to" className="text-xs">To</Label>
              <Input
                id="rep-to"
                type="date"
                value={to}
                className="h-10 w-full min-w-[9.5rem] sm:h-8 sm:w-36"
                onChange={(e) => applyCustom(from, e.target.value)}
              />
            </div>
            <p className="pb-1 text-xs text-muted-foreground">
              {from === to ? from : `${from} → ${to}`}
              {updatedAt ? ` · Updated ${formatDateTime(updatedAt)}` : null}
              {from === today && to === today ? " · Today" : null}
            </p>
          </div>
        </div>

        <div className="mt-4 -mx-1 overflow-x-auto print:hidden">
          <div className="flex min-w-max gap-1 px-1 pb-1">
            {REPORT_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pushState({ tab: t.id })}
                className={cn(
                  "min-h-10 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:min-h-0 sm:py-1.5",
                  tab === t.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 hidden print:block">
          <h2 className="text-lg font-semibold capitalize">{tab} report</h2>
          <p className="text-sm text-muted-foreground">
            {from === to ? from : `${from} → ${to}`}
          </p>
        </div>
      </div>

      {error ? <ReportError message={error} /> : null}
      {loading && !cache[tab] ? <ReportLoading className="min-h-[320px]" /> : null}

      {!loading || cache[tab] ? (
        <div className={cn(loading && "opacity-60")}>
          {tab === "overall" && cache.overall ? <OverallTab data={cache.overall} /> : null}
          {tab === "sales" && cache.sales ? <SalesTab data={cache.sales} /> : null}
          {tab === "services" && cache.services ? <ServicesTab data={cache.services} /> : null}
          {tab === "customers" && cache.customers ? <CustomersTab data={cache.customers} /> : null}
          {tab === "appointments" && cache.appointments ? (
            <AppointmentsTab data={cache.appointments} />
          ) : null}
          {tab === "staff" && cache.staff ? <StaffTab data={cache.staff} /> : null}
          {tab === "inventory" && cache.inventory ? <InventoryTab data={cache.inventory} /> : null}
          {tab === "in_house" && cache.in_house ? <InHouseUsageTab data={cache.in_house} /> : null}
          {tab === "products" && cache.products ? <ProductsTab data={cache.products} /> : null}
          {tab === "finance" && cache.finance ? <FinanceTab data={cache.finance} /> : null}
          {tab === "payments" && cache.payments ? <PaymentsTab data={cache.payments} /> : null}
          {tab === "dues" && cache.dues ? <DuesTab data={cache.dues} /> : null}
        </div>
      ) : null}
    </div>
  );
}
