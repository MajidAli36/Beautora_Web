import { requireAction } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  compareMetric,
  getPreviousPeriod,
  resolveReportRange,
  type CompareResult,
} from "@/lib/reports/range";
import {
  SAFE_SALE_ID_CHUNK,
  chunkIds,
  fetchAllPages,
} from "@/lib/supabase/paginate";

export type ReportContext = {
  organizationId: string;
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  start: Date;
  end: Date;
  prevStart: Date;
  prevEnd: Date;
};

export async function createReportContext(from?: string, to?: string): Promise<ReportContext> {
  const org = await requireAction("reports.view");
  const { start, end, fromLabel, toLabel } = resolveReportRange(from, to);
  const prev = getPreviousPeriod(fromLabel, toLabel);
  const prevRange = resolveReportRange(prev.from, prev.to);

  return {
    organizationId: org.organizationId,
    from: fromLabel,
    to: toLabel,
    prevFrom: prev.from,
    prevTo: prev.to,
    start,
    end,
    prevStart: prevRange.start,
    prevEnd: prevRange.end,
  };
}

export async function getSupabase() {
  return createClient();
}

export function cmp(current: number, previous: number): CompareResult {
  return compareMetric(current, previous);
}

export type CompletedSaleRow = {
  id: string;
  total: number;
  subtotal: number;
  discount: number;
  tax: number;
  deposit_applied: number;
  completed_at: string | null;
  customer_id: string | null;
  appointment_id: string | null;
  staff_id: string | null;
  created_by: string | null;
  status: string;
};

export async function fetchCompletedSales(
  ctx: ReportContext,
  which: "current" | "previous" = "current"
): Promise<CompletedSaleRow[]> {
  const supabase = await getSupabase();
  const start = which === "current" ? ctx.start : ctx.prevStart;
  const end = which === "current" ? ctx.end : ctx.prevEnd;

  const data = await fetchAllPages<{
    id: string;
    total: number;
    subtotal: number;
    discount: number;
    tax: number;
    deposit_applied: number;
    completed_at: string | null;
    customer_id: string | null;
    appointment_id: string | null;
    staff_id: string | null;
    created_by: string | null;
    status: string;
  }>((from, to) =>
    supabase
      .from("sales")
      .select(
        "id, total, subtotal, discount, tax, deposit_applied, completed_at, customer_id, appointment_id, staff_id, created_by, status"
      )
      .eq("organization_id", ctx.organizationId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", start.toISOString())
      .lte("completed_at", end.toISOString())
      .order("completed_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)
  );

  return data.map((s) => ({
    id: s.id,
    total: Number(s.total) || 0,
    subtotal: Number(s.subtotal) || 0,
    discount: Number(s.discount) || 0,
    tax: Number(s.tax) || 0,
    deposit_applied: Number(s.deposit_applied) || 0,
    completed_at: s.completed_at,
    customer_id: s.customer_id,
    appointment_id: s.appointment_id,
    staff_id: s.staff_id,
    created_by: s.created_by,
    status: s.status,
  }));
}

export async function fetchSaleItems(
  organizationId: string,
  saleIds: string[]
): Promise<
  {
    sale_id: string;
    item_type: string;
    item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    unit_cost: number;
  }[]
> {
  if (!saleIds.length) return [];
  const supabase = await getSupabase();
  const parts = await Promise.all(
    chunkIds(saleIds, SAFE_SALE_ID_CHUNK).map((chunk) =>
      fetchAllPages<{
        sale_id: string;
        item_type: string;
        item_id: string;
        name: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        unit_cost: number | null;
      }>((from, to) =>
        supabase
          .from("sale_items")
          .select("sale_id, item_type, item_id, name, quantity, unit_price, line_total, unit_cost")
          .eq("organization_id", organizationId)
          .in("sale_id", chunk)
          .order("sale_id")
          .order("id")
          .range(from, to)
      )
    )
  );

  return parts.flat().map((r) => ({
    sale_id: r.sale_id,
    item_type: r.item_type,
    item_id: r.item_id,
    name: r.name,
    quantity: Number(r.quantity) || 0,
    unit_price: Number(r.unit_price) || 0,
    line_total: Number(r.line_total) || 0,
    unit_cost: Number(r.unit_cost) || 0,
  }));
}
