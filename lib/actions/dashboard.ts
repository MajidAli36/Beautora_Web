"use server";

import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import {
  getLocalDateString,
  addLocalDays,
  startOfLocalDay,
  endOfLocalDay,
  isoToLocalDateString,
} from "@/lib/dates/local";
import { roundMoney } from "@/lib/sales/calculate";
import { getInventorySummary } from "@/lib/inventory/valuation";

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
    inventoryValueAtCost: number;
    inventoryValueAtRetail: number;
    inventoryUnitsOnHand: number;
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
    chartSalesRes,
    retentionSalesRes,
    recentAppointmentsRes,
    todayDepositsRes,
    todayExpensesRes,
    todayStaffPayRes,
    topServicesRpc,
  ] = await Promise.all([
    // One range covers yesterday + today; split in JS (saves a sales RTT).
    supabase
      .from("sales")
      .select("id, total, completed_at")
      .eq("organization_id", orgId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", yesterdayStart.toISOString())
      .lte("completed_at", todayEnd.toISOString()),
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
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold, cost_price, retail_price, is_active")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("stock_quantity")
      .limit(300),
    supabase
      .from("sales")
      .select("id, total, completed_at")
      .eq("organization_id", orgId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", chartStart.toISOString())
      .order("completed_at")
      .limit(2000),
    supabase
      .from("sales")
      .select("customer_id, total")
      .eq("organization_id", orgId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .not("customer_id", "is", null)
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .limit(2000),
    supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("scheduled_at", chartStart.toISOString())
      .limit(2000),
    supabase
      .from("appointment_deposits")
      .select("amount")
      .eq("organization_id", orgId)
      .in("status", ["APPROVED", "REFUNDED"])
      .gte("paid_at", todayStart.toISOString())
      .lte("paid_at", todayEnd.toISOString()),
    supabase
      .from("expenses")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("expense_date", todayLabel),
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

  const productLines =
    todaySaleIds.length > 0
      ? await supabase
          .from("sale_items")
          .select("name, quantity, line_total, unit_cost")
          .eq("organization_id", orgId)
          .eq("item_type", "PRODUCT")
          .in("sale_id", todaySaleIds)
      : {
          data: [] as {
            name: string;
            quantity: number;
            line_total: number;
            unit_cost: number | null;
          }[],
        };

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

  const inventorySummary = getInventorySummary(productsRes.data ?? []);

  const revenueByDayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    revenueByDayMap[addLocalDays(todayStr, -29 + i)] = 0;
  }
  for (const sale of chartSalesRes.data ?? []) {
    if (!sale.completed_at) continue;
    const day = isoToLocalDateString(sale.completed_at);
    if (day in revenueByDayMap) {
      revenueByDayMap[day] = roundMoney(revenueByDayMap[day] + Number(sale.total));
    }
  }
  const revenueByDay = Object.entries(revenueByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  let topServices: { name: string; qty: number; revenue: number }[] = [];
  if (!topServicesRpc.error && Array.isArray(topServicesRpc.data)) {
    topServices = topServicesRpc.data.map((r) => ({
      name: String(r.name),
      qty: Number(r.qty) || 0,
      revenue: roundMoney(Number(r.revenue) || 0),
    }));
  }

  const customerSaleCounts = new Map<string, number>();
  let totalSpend = 0;
  for (const sale of retentionSalesRes.data ?? []) {
    if (!sale.customer_id) continue;
    customerSaleCounts.set(
      sale.customer_id,
      (customerSaleCounts.get(sale.customer_id) ?? 0) + 1
    );
    totalSpend = roundMoney(totalSpend + Number(sale.total));
  }
  const customersWithSales = customerSaleCounts.size;
  const returningCustomers = [...customerSaleCounts.values()].filter((c) => c > 1).length;
  const averageSpend =
    customersWithSales > 0 ? roundMoney(totalSpend / customersWithSales) : 0;
  const retentionRate =
    customersWithSales > 0 ? (returningCustomers / customersWithSales) * 100 : null;

  const appointmentsByDayMap: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    appointmentsByDayMap[addLocalDays(todayStr, -29 + i)] = 0;
  }
  for (const appt of recentAppointmentsRes.data ?? []) {
    const day = isoToLocalDateString(appt.scheduled_at);
    if (day in appointmentsByDayMap) {
      appointmentsByDayMap[day] += 1;
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
      serviceRevenue: 0,
      lowStockCount: lowStockProducts.length,
      productsSold,
    },
  };
}
