import { PageHeader } from "@/components/layout/page-header";
import { Suspense } from "react";
import Link from "next/link";
import { getSales } from "@/lib/actions/sales";
import { getCapabilities } from "@/lib/auth/permissions";
import { SalesTableCard } from "@/components/features/sales/sales-table";
import { SalesSearch } from "@/components/features/sales/sales-search";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalePaymentStatus } from "@/types/commerce";

const PAYMENT_STATUSES = new Set<SalePaymentStatus>([
  "PAID",
  "PARTIALLY_PAID",
  "UNPAID",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
]);

type SalesPageProps = {
  searchParams: Promise<{ q?: string; payment?: string }>;
};

export default async function SalesPage({ searchParams }: SalesPageProps) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const paymentRaw = params.payment?.trim().toUpperCase();
  const paymentStatus =
    paymentRaw && PAYMENT_STATUSES.has(paymentRaw as SalePaymentStatus)
      ? (paymentRaw as SalePaymentStatus)
      : undefined;

  const [sales, salesCaps, posCaps] = await Promise.all([
    getSales({ search: q, paymentStatus }),
    getCapabilities("sales"),
    getCapabilities("pos"),
  ]);
  const canManage = salesCaps.canEdit || salesCaps.canDelete;
  const canPos = Boolean(posCaps.actions["pos.sell"]);

  const rows = sales.map((sale) => {
    const s = sale as typeof sale & {
      payment_status?: string;
      amount_paid?: number;
      amount_due?: number;
      payment_version?: number;
    };
    return {
      id: s.id,
      total: s.total,
      status: s.status,
      payment_status: s.payment_status,
      amount_paid: s.amount_paid,
      amount_due: s.amount_due,
      payment_version: s.payment_version,
      completed_at: s.completed_at,
      created_at: s.created_at,
      void_reason: (s as { void_reason?: string | null }).void_reason ?? null,
      deleted_at: (s as { deleted_at?: string | null }).deleted_at ?? null,
      customer: s.customer as {
        first_name: string;
        last_name: string | null;
        phone?: string | null;
      } | null,
      invoice: s.invoice as
        | { invoice_number: string }[]
        | { invoice_number: string }
        | null,
    };
  });

  const filterBits = [
    q ? `“${q}”` : null,
    paymentStatus ? paymentStatus.replaceAll("_", " ").toLowerCase() : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Sales"
          description="View invoices, collect dues, amend, refund, or soft-delete. Deleted invoices stay listed as Disabled and are excluded from revenue and staff reports."
        />
        {canPos && <Button render={<Link href="/pos" />}>New sale</Button>}
      </div>

      <Suspense fallback={<Skeleton className="h-10 max-w-md" />}>
        <SalesSearch />
      </Suspense>

      <SalesTableCard
        sales={rows}
        canManage={canManage}
        canReceivePayment={canPos || canManage}
        emptyLabel={
          filterBits.length
            ? `No sales match ${filterBits.join(" · ")}. Try another search or payment status.`
            : undefined
        }
      />
    </div>
  );
}
