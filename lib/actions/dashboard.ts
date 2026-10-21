"use server";

import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import {
  getLocalDateString,
  addLocalDays,
  startOfLocalDay,
  endOfLocalDay,
} from "@/lib/dates/local";
import { roundMoney } from "@/lib/sales/calculate";
import {
  SAFE_SALE_ID_CHUNK,
  chunkIds,
  fetchAllPages,
} from "@/lib/supabase/paginate";

export type DashboardAppointment = {
  id: string;
  scheduledAt: string;
  status: string;
  customerName: string;
  staffName: string | null;
  serviceName: string;
};

export type DashboardData = {
  todayRevenue: number;
  yesterdayRevenue: number;
  appointmentsToday: DashboardAppointment[];
  appointmentStats: {
    total: number;
    completed: number;
    upcoming: number;
    cancelled: number;
  };
  customerCount: number;
  newCustomersThisWeek: number;
  returningCustomers: number;
  averageSpend: number;
  retentionRate: number | null;
  lowStockCount: number;
  lowStockProducts: { id: string; name: string; stock: number; threshold: number }[];
  inventoryValueAtCost: number;
  productGrossProfitToday: number;
  stockToday: {
    unitsSold: number;
    retailRevenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    marginPercent: number;
    /** Sellable (RETAIL/BOTH) on-hand at cost — used for shelf / markup. */
    inventoryValueAtCost: number;
    inventoryValueAtRetail: number;
    inventoryUnitsOnHand: number;
    /** Back-bar IN_HOUSE only (not POS product sales). */
    inHouseValueAtCost: number;
    inHouseUnitsOnHand: number;
    serviceRevenue: number;
    lowStockCount: number;
    productsSold: { name: string; qty: number; revenue: number; profit: number }[];
  };
  revenueByDay: { date: string; revenue: number }[];
  topServices: { name: string; qty: number; revenue: number }[];
  appointmentsByDay: { date: string; count: number }[];
  todayFinances: {
    salesRevenue: number;
    advancesCollected: number;
    totalExpenses: number;
    staffPayments: number;
    productCogs: number;
    productGrossProfit: number;
    productUnitsSold: number;
    productRetailRevenue: number;
    inventoryValueAtCost: number;
    netProfit: number;
    netCashFlow: number;
  } | null;
};

type ApptRow = {
  id: string;
  scheduled_at: string;
  status: string;
  customer: { first_name: string; last_name: string | null } | null;
  staff: { full_name: string } | null;
  services: { service_name: string }[] | null;
};

function mapAppointment(appt: ApptRow): DashboardAppointment {
  return {
    id: appt.id,
    scheduledAt: appt.scheduled_at,
    status: appt.status,
    customerName: [appt.customer?.first_name, appt.customer?.last_name]
      .filter(Boolean)
      .join(" "),
    staffName: appt.staff?.full_name ?? null,
    serviceName: appt.services?.[0]?.service_name ?? "Appointment",
  };
}

/** Lean dashboard — no full finances fan-out; uses RPCs + bounded scans. */
export async function getDashboardData(): Promise<DashboardData> {
  const org = await requireOrganization();
  const supabase = await createClient();
  const orgId = org.organizationId;

  const todayStr = getLocalDateString();
  const yesterdayStr = addLocalDays(todayStr, -1);
  const weekAgo = startOfLocalDay(addLocalDays(todayStr, -7));
  const thirtyDaysAgo = startOfLocalDay(addLocalDays(todayStr, -29));
  const chartStart = thirtyDaysAgo;
  const todayStart = startOfLocalDay(todayStr);
  const todayEnd = endOfLocalDay(todayStr);
  const yesterdayStart = startOfLocalDay(yesterdayStr);
  const yesterdayEnd = endOfLocalDay(yesterdayStr);
  const todayLabel = todayStr;

  const [
    twoDaySalesRes,
    appointmentsRes,
    customerCountRes,
    newCustomersRes,
    productsRes,
    revenueByDayRpc,
    retentionRpc,
    appointmentsByDayRpc,
    inventoryValRpc,
    todayDepositsRes,
    todayExpensesRes,
    todayStaffPayRes,
    topServicesRpc,
  ] = await Promise.all([
    // Yesterday + today — paginated so busy days aren't truncated at max_rows.
    fetchAllPages<{ id: string; total: number; completed_at: string | null }>(
      (from, to) =>
        supabase
          .from("sales")
          .select("id, total, completed_at")
          .eq("organization_id", orgId)
          .in("status", ["COMPLETED", "AMENDED"])
          .is("deleted_at", null)
          .gte("completed_at", yesterdayStart.toISOString())
          .lte("completed_at", todayEnd.toISOString())
          .order("completed_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
    ).then((data) => ({ data })),
    supabase
      .from("appointments")
      .select(
        `
        id, scheduled_at, status,
        customer:customers(first_name, last_name),
        staff:staff(full_name),
        services:appointment_services(service_name)
      `
      )
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("scheduled_at", todayStart.toISOString())
      .lte("scheduled_at", todayEnd.toISOString())
      .order("scheduled_at")
      .limit(100),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("created_at", weekAgo.toISOString()),
    // Low-stock sample only — full valuation via RPC.
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, cost_price, retail_price, is_active")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("stock_quantity")
      .limit(50),
    supabase.rpc("dashboard_revenue_by_day", {
      p_organization_id: orgId,
      p_since: chartStart.toISOString(),
      p_until: todayEnd.toISOString(),
    }),
    supabase.rpc("dashboard_retention_stats", {
      p_organization_id: orgId,
      p_since: thirtyDaysAgo.toISOString(),
    }),
    supabase.rpc("dashboard_appointments_by_day", {
      p_organization_id: orgId,
      p_since: chartStart.toISOString(),
      p_until: todayEnd.toISOString(),
    }),
    supabase.rpc("dashboard_inventory_valuation", {
      p_organization_id: orgId,
    }),
    supabase
      .from("appointment_deposits")
      .select("amount")
      .eq("organization_id", orgId)
      .in("status", ["APPROVED", "REFUNDED"])
      .gte("paid_at", todayStart.toISOString())
      .lte("paid_at", todayEnd.toISOString()),
    // Exclude payroll mirrors linked via staff_payment_id — those are counted
    // once via staff_payments below (same rule as finance_period_cash_totals).
    supabase
      .from("expenses")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("expense_date", todayLabel)
      .is("staff_payment_id", null),
    supabase
      .from("staff_payments")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("payment_date", todayLabel),
    supabase.rpc("dashboard_top_services", {
      p_organization_id: orgId,
      p_since: thirtyDaysAgo.toISOString(),
      p_limit: 5,
    }),
  ]);

  if (revenueByDayRpc.error) throw new Error(revenueByDayRpc.error.message);
  if (retentionRpc.error) throw new Error(retentionRpc.error.message);
  if (appointmentsByDayRpc.error) throw new Error(appointmentsByDayRpc.error.message);
  if (inventoryValRpc.error) throw new Error(inventoryValRpc.error.message);
  if (topServicesRpc.error) throw new Error(topServicesRpc.error.message);

  const todayStartMs = todayStart.getTime();
  const todayEndMs = todayEnd.getTime();
  const todaySaleIds: string[] = [];
  let todayRevenueRaw = 0;
  let yesterdayRevenueRaw = 0;
  for (const s of twoDaySalesRes.data ?? []) {
    if (!s.completed_at) continue;
    const t = new Date(s.completed_at).getTime();
    const total = Number(s.total);
    if (t >= todayStartMs && t <= todayEndMs) {
      todaySaleIds.push(s.id);
      todayRevenueRaw += total;
    } else if (t >= yesterdayStart.getTime() && t <= yesterdayEnd.getTime()) {
      yesterdayRevenueRaw += total;
    }
  }
  const todayRevenue = roundMoney(todayRevenueRaw);
  const yesterdayRevenue = roundMoney(yesterdayRevenueRaw);

  const productLineRows =
    todaySaleIds.length > 0
      ? (
          await Promise.all(
            chunkIds(todaySaleIds, SAFE_SALE_ID_CHUNK).map((chunk) =>
              fetchAllPages<{
                name: string;
                quantity: number;
                line_total: number;
                unit_cost: number | null;
              }>((from, to) =>
                supabase
                  .from("sale_items")
                  .select("name, quantity, line_total, unit_cost")
                  .eq("organization_id", orgId)
                  .eq("item_type", "PRODUCT")
                  .in("sale_id", chunk)
                  .order("sale_id")
                  .order("id")
                  .range(from, to)
              )
            )
          )
        ).flat()
      : [];
  const productLines = { data: productLineRows };

  const appointmentsRaw = (appointmentsRes.data ?? []) as unknown as ApptRow[];
  const appointments = appointmentsRaw.map(mapAppointment);

  const completedStatuses = new Set(["COMPLETED"]);
  const upcomingStatuses = new Set([
    "SCHEDULED",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
  ]);

  const appointmentStats = {
    total: appointments.length,
    completed: appointments.filter((a) => completedStatuses.has(a.status)).length,
    upcoming: appointments.filter((a) => upcomingStatuses.has(a.status)).length,
    cancelled: appointments.filter(
      (a) => a.status === "CANCELLED" || a.status === "NO_SHOW"
    ).length,
  };

  const lowStockProducts = (productsRes.data ?? [])
    .filter((p) => p.stock_quantity <= p.low_stock_threshold)
    .map((p) => ({
      id: p.id,
      name: p.name,
      stock: p.stock_quantity,
      threshold: p.low_stock_threshold,
    }));

  const invRow = (Array.isArray(inventoryValRpc.data)
    ? inventoryValRpc.data[0]
    : inventoryValRpc.data) as
    | {
        value_at_cost?: number | string | null;
        value_at_retail?: number | string | null;
        units_on_hand?: number | string | null;
        retail_value_at_cost?: number | string | null;
        retail_value_at_retail?: number | string | null;
        retail_units?: number | string | null;
        in_house_value_at_cost?: number | string | null;
        in_house_units?: number | string | null;
      }
    | null
    | undefined;

  // Prefer sellable-only columns when migration is applied; fall back to totals.
  const hasRetailSplit = invRow?.retail_value_at_cost != null;
  const retailValueAtCost = roundMoney(
    Number(hasRetailSplit ? invRow?.retail_value_at_cost : invRow?.value_at_cost) || 0
  );
  const retailValueAtRetail = roundMoney(
    Number(hasRetailSplit ? invRow?.retail_value_at_retail : invRow?.value_at_retail) || 0
  );
  const retailUnits = Number(
    hasRetailSplit ? invRow?.retail_units : invRow?.units_on_hand
  ) || 0;
  const inHouseValueAtCost = roundMoney(Number(invRow?.in_house_value_at_cost) || 0);
  const inHouseUnits = Number(invRow?.in_house_units) || 0;
  const inventorySummary = {
    totalValueAtCost: retailValueAtCost,
    totalValueAtRetail: retailValueAtRetail,
    totalPotentialProfit: roundMoney(retailValueAtRetail - retailValueAtCost),
    totalUnits: retailUnits,
    inHouseValueAtCost,
    inHouseUnits,
  };

  const revenueByDayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    revenueByDayMap[addLocalDays(todayStr, -29 + i)] = 0;
  }
  for (const row of revenueByDayRpc.data ?? []) {
    const day = typeof row.day === "string" ? row.day.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day in revenueByDayMap) {
      revenueByDayMap[day] = roundMoney(Number(row.revenue) || 0);
    }
  }
  const revenueByDay = Object.entries(revenueByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  const topServices = (topServicesRpc.data ?? []).map((r) => ({
    name: String(r.name),
    qty: Number(r.qty) || 0,
    revenue: roundMoney(Number(r.revenue) || 0),
  }));

  const retentionRow = Array.isArray(retentionRpc.data)
    ? retentionRpc.data[0]
    : retentionRpc.data;
  const customersWithSales = Number(retentionRow?.customers_with_sales) || 0;
  const returningCustomers = Number(retentionRow?.returning_customers) || 0;
  const totalSpend = roundMoney(Number(retentionRow?.total_spend) || 0);
  const averageSpend =
    customersWithSales > 0 ? roundMoney(totalSpend / customersWithSales) : 0;
  const retentionRate =
    customersWithSales > 0 ? (returningCustomers / customersWithSales) * 100 : null;

  const appointmentsByDayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    appointmentsByDayMap[addLocalDays(todayStr, -29 + i)] = 0;
  }
  for (const row of appointmentsByDayRpc.data ?? []) {
    const day = typeof row.day === "string" ? row.day.slice(0, 10) : "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && day in appointmentsByDayMap) {
      appointmentsByDayMap[day] = Number(row.appt_count) || 0;
    }
  }
  const appointmentsByDay = Object.entries(appointmentsByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  let unitsSold = 0;
  let productRetailRevenue = 0;
  let productCogs = 0;
  const productAgg = new Map<string, { qty: number; revenue: number; cogs: number }>();
  for (const line of productLines.data ?? []) {
    const qty = Number(line.quantity) || 0;
    const revenue = Number(line.line_total) || 0;
    const cogs = qty * (Number(line.unit_cost) || 0);
    unitsSold += qty;
    productRetailRevenue += revenue;
    productCogs += cogs;
    const prev = productAgg.get(line.name) ?? { qty: 0, revenue: 0, cogs: 0 };
    prev.qty += qty;
    prev.revenue += revenue;
    prev.cogs += cogs;
    productAgg.set(line.name, prev);
  }
  productRetailRevenue = roundMoney(productRetailRevenue);
  productCogs = roundMoney(productCogs);
  const productGrossProfit = roundMoney(productRetailRevenue - productCogs);
  const marginPercent =
    productRetailRevenue > 0
      ? Math.round((productGrossProfit / productRetailRevenue) * 100)
      : 0;

  const advancesCollected = roundMoney(
    (todayDepositsRes.data ?? []).reduce((s, d) => s + Number(d.amount), 0)
  );
  const totalExpenses = roundMoney(
    (todayExpensesRes.data ?? []).reduce((s, e) => s + Number(e.amount), 0)
  );
  const staffPayments = roundMoney(
    (todayStaffPayRes.data ?? []).reduce((s, p) => s + Number(p.amount), 0)
  );
  const netProfit = roundMoney(
    todayRevenue - totalExpenses - staffPayments - productCogs
  );
  const netCashFlow = roundMoney(todayRevenue + advancesCollected - totalExpenses - staffPayments);

  const productsSold = [...productAgg.entries()]
    .map(([name, v]) => ({
      name,
      qty: v.qty,
      revenue: roundMoney(v.revenue),
      profit: roundMoney(v.revenue - v.cogs),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    todayRevenue,
    yesterdayRevenue,
    appointmentsToday: appointments.slice(0, 8),
    appointmentStats,
    customerCount: customerCountRes.count ?? 0,
    newCustomersThisWeek: newCustomersRes.count ?? 0,
    returningCustomers,
    averageSpend,
    retentionRate,
    lowStockCount: lowStockProducts.length,
    lowStockProducts: lowStockProducts.slice(0, 5),
    revenueByDay,
    topServices,
    appointmentsByDay,
    todayFinances: {
      salesRevenue: todayRevenue,
      advancesCollected,
      totalExpenses,
      staffPayments,
      productCogs,
      productGrossProfit,
      productUnitsSold: unitsSold,
      productRetailRevenue,
      inventoryValueAtCost: inventorySummary.totalValueAtCost,
      netProfit,
      netCashFlow,
    },
    inventoryValueAtCost: inventorySummary.totalValueAtCost,
    productGrossProfitToday: productGrossProfit,
    stockToday: {
      unitsSold,
      retailRevenue: productRetailRevenue,
      costOfGoodsSold: productCogs,
      grossProfit: productGrossProfit,
      marginPercent,
      inventoryValueAtCost: inventorySummary.totalValueAtCost,
      inventoryValueAtRetail: inventorySummary.totalValueAtRetail,
      inventoryUnitsOnHand: inventorySummary.totalUnits,
      inHouseValueAtCost: inventorySummary.inHouseValueAtCost,
      inHouseUnitsOnHand: inventorySummary.inHouseUnits,
      serviceRevenue: 0,
      lowStockCount: lowStockProducts.length,
      productsSold,
    },
  };
}
