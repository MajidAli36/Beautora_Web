"use server";

import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { getFinancialSummary } from "@/lib/actions/finances";
import {
  getLocalDateString,
  addLocalDays,
  startOfLocalDay,
  endOfLocalDay,
  isoToLocalDateString,
} from "@/lib/dates/local";
import { roundMoney } from "@/lib/sales/calculate";

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

/** Lean dashboard loader — avoids full finance×2, reports, and unbounded customer/sales pulls. */
export async function getDashboardData(): Promise<DashboardData> {
  const org = await requireOrganization();
  const supabase = await createClient();
  const orgId = org.organizationId;

  const todayStr = getLocalDateString();
  const yesterdayStr = addLocalDays(todayStr, -1);
  const weekAgo = startOfLocalDay(addLocalDays(todayStr, -7));
  const ninetyDaysAgo = startOfLocalDay(addLocalDays(todayStr, -90));
  const chartStart = startOfLocalDay(addLocalDays(todayStr, -89));
  const todayStart = startOfLocalDay(todayStr);
  const todayEnd = endOfLocalDay(todayStr);
  const yesterdayStart = startOfLocalDay(yesterdayStr);
  const yesterdayEnd = endOfLocalDay(yesterdayStr);

  const [
    todayFinancesRaw,
    yesterdaySalesRes,
    appointmentsRes,
    customerCountRes,
    newCustomersRes,
    productsRes,
    chartSalesRes,
    retentionSalesRes,
    recentAppointmentsRes,
  ] = await Promise.all([
    getFinancialSummary(todayStr, todayStr).catch(() => null),
    supabase
      .from("sales")
      .select("total")
      .eq("organization_id", orgId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", yesterdayStart.toISOString())
      .lte("completed_at", yesterdayEnd.toISOString()),
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
      .order("scheduled_at"),
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
      .select("id, name, stock_quantity, low_stock_threshold")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("stock_quantity")
      .limit(200),
    supabase
      .from("sales")
      .select("id, total, completed_at")
      .eq("organization_id", orgId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .gte("completed_at", chartStart.toISOString())
      .order("completed_at"),
    supabase
      .from("sales")
      .select("customer_id, total")
      .eq("organization_id", orgId)
      .in("status", ["COMPLETED", "AMENDED"])
      .is("deleted_at", null)
      .not("customer_id", "is", null)
      .gte("completed_at", ninetyDaysAgo.toISOString()),
    supabase
      .from("appointments")
      .select("scheduled_at")
      .eq("organization_id", orgId)
      .is("deleted_at", null)
      .gte("scheduled_at", chartStart.toISOString()),
  ]);

  const todayRevenue = roundMoney(todayFinancesRaw?.salesRevenue ?? 0);
  const yesterdayRevenue = roundMoney(
    (yesterdaySalesRes.data ?? []).reduce((sum, s) => sum + Number(s.total), 0)
  );

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

  const revenueByDayMap: Record<string, number> = {};
  for (let i = 0; i < 90; i++) {
    revenueByDayMap[addLocalDays(todayStr, -89 + i)] = 0;
  }
  const chartSaleIds: string[] = [];
  for (const sale of chartSalesRes.data ?? []) {
    if (!sale.completed_at) continue;
    const day = isoToLocalDateString(sale.completed_at);
    if (day in revenueByDayMap) {
      revenueByDayMap[day] = roundMoney(revenueByDayMap[day] + Number(sale.total));
    }
    chartSaleIds.push(sale.id);
  }
  const revenueByDay = Object.entries(revenueByDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // Top services from last 90 days of chart sales (chunked)
  const serviceAgg = new Map<string, { qty: number; revenue: number }>();
  if (chartSaleIds.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < chartSaleIds.length; i += 200) {
      chunks.push(chartSaleIds.slice(i, i + 200));
    }
    const itemResults = await Promise.all(
      chunks.map((chunk) =>
        supabase
          .from("sale_items")
          .select("name, quantity, line_total")
          .eq("organization_id", orgId)
          .eq("item_type", "SERVICE")
          .in("sale_id", chunk)
      )
    );
    for (const { data } of itemResults) {
      for (const item of data ?? []) {
        const prev = serviceAgg.get(item.name) ?? { qty: 0, revenue: 0 };
        prev.qty += Number(item.quantity) || 0;
        prev.revenue = roundMoney(prev.revenue + (Number(item.line_total) || 0));
        serviceAgg.set(item.name, prev);
      }
    }
  }
  const topServices = [...serviceAgg.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

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
  for (let i = 0; i < 90; i++) {
    appointmentsByDayMap[addLocalDays(todayStr, -89 + i)] = 0;
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
    todayFinances: todayFinancesRaw
      ? {
          salesRevenue: todayFinancesRaw.salesRevenue,
          advancesCollected: todayFinancesRaw.advancesCollected,
          totalExpenses: todayFinancesRaw.totalExpenses,
          staffPayments: todayFinancesRaw.staffPayments,
          productCogs: todayFinancesRaw.productCogs,
          productGrossProfit: todayFinancesRaw.productGrossProfit,
          productUnitsSold: todayFinancesRaw.productUnitsSold,
          productRetailRevenue: todayFinancesRaw.productRetailRevenue,
          inventoryValueAtCost: todayFinancesRaw.inventoryValueAtCost,
          netProfit: todayFinancesRaw.netProfit,
          netCashFlow: todayFinancesRaw.netCashFlow,
        }
      : null,
    inventoryValueAtCost: todayFinancesRaw?.inventoryValueAtCost ?? 0,
    productGrossProfitToday: todayFinancesRaw?.productGrossProfit ?? 0,
    stockToday: {
      unitsSold: todayFinancesRaw?.productUnitsSold ?? 0,
      retailRevenue: todayFinancesRaw?.productRetailRevenue ?? 0,
      costOfGoodsSold: todayFinancesRaw?.productCogs ?? 0,
      grossProfit: todayFinancesRaw?.productGrossProfit ?? 0,
      marginPercent: todayFinancesRaw?.productMarginPercent ?? 0,
      inventoryValueAtCost: todayFinancesRaw?.inventoryValueAtCost ?? 0,
      inventoryValueAtRetail: todayFinancesRaw?.inventoryValueAtRetail ?? 0,
      inventoryUnitsOnHand: todayFinancesRaw?.inventoryUnitsOnHand ?? 0,
      serviceRevenue: todayFinancesRaw?.serviceRevenue ?? 0,
      lowStockCount: lowStockProducts.length,
      productsSold: (todayFinancesRaw?.productSaleRows ?? []).slice(0, 5).map((r) => ({
        name: r.name,
        qty: r.qtySold,
        revenue: r.retailRevenue,
        profit: r.grossProfit,
      })),
    },
  };
}
