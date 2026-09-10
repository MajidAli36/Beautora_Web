import type {
  AppointmentsReport,
  CustomersReport,
  DuesReport,
  FinanceReport,
  InHouseUsageReport,
  InventoryReport,
  OverallReport,
  PaymentsReport,
  ProductsReport,
  SalesReport,
  ServicesReport,
  StaffReport,
} from "@/lib/actions/reports";
import type { ExportDocument, ExportSheet } from "@/lib/reports/export-formats";
import type { ReportTabId } from "@/lib/reports/range";
import type { CompareResult } from "@/lib/reports/range";

function kpiSheet(name: string, rows: [string, string | number][]): ExportSheet {
  return {
    name,
    headers: ["Metric", "Value"],
    rows,
  };
}

function cmpValue(c: CompareResult): number {
  return c.current;
}

function periodSubtitle(from: string, to: string, generatedAt?: string) {
  return generatedAt ? `${from} → ${to} · Generated ${generatedAt}` : `${from} → ${to}`;
}

function buildOverall(data: OverallReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `overall-report-${data.from}-${data.to}`,
    title: "Overall report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Total revenue", cmpValue(k.totalRevenue)],
        ["Net revenue", cmpValue(k.netRevenue)],
        ["Sales", cmpValue(k.saleCount)],
        ["Avg ticket", cmpValue(k.aov)],
        ["Service revenue (line)", cmpValue(k.serviceRevenue)],
        ["Product revenue (line)", cmpValue(k.productRevenue)],
        ["Package revenue (line)", cmpValue(k.packageRevenue)],
        ["Discounts", cmpValue(k.discounts)],
        ["Deposit refunds", cmpValue(k.depositRefunds)],
        ["Product gross profit", cmpValue(k.productGrossProfit)],
      ]),
      {
        name: "Revenue by day",
        headers: ["Day", "Revenue"],
        rows: data.revenueByDay.map((r) => [r.label, r.value]),
      },
      {
        name: "Revenue mix",
        headers: ["Category", "Amount"],
        rows: data.revenueSplit.map((r) => [r.name, r.value]),
      },
      {
        name: "Top services",
        headers: ["Name", "Qty", "Revenue"],
        rows: data.topServices.map((r) => [r.name, r.qty, r.revenue]),
      },
      {
        name: "Top products",
        headers: ["Name", "Qty", "Revenue"],
        rows: data.topProducts.map((r) => [r.name, r.qty, r.revenue]),
      },
    ],
  };
}

function buildSales(data: SalesReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `sales-report-${data.from}-${data.to}`,
    title: "Sales report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Completed sales", cmpValue(k.completedSales)],
        ["Voided sales", cmpValue(k.voidedSales)],
        ["Gross sales", cmpValue(k.grossSales)],
        ["Ticket revenue", cmpValue(k.netSales)],
        ["Discounts", cmpValue(k.discounts)],
        ["Avg sale", cmpValue(k.aov)],
        ["Items sold", cmpValue(k.itemsSold)],
      ]),
      {
        name: "Sales ledger",
        headers: [
          "Date",
          "Invoice",
          "Customer",
          "Items",
          "Subtotal",
          "Discount",
          "Tax",
          "Total",
          "Payment",
          "Status",
        ],
        rows: data.ledger.map((r) => [
          r.completedAt ?? "",
          r.invoiceNumber ?? "",
          r.customerName ?? "",
          r.itemSummary,
          r.subtotal,
          r.discount,
          r.tax,
          r.total,
          r.paymentMethod,
          r.status,
        ]),
      },
      {
        name: "By payment",
        headers: ["Method", "Amount"],
        rows: data.byPayment.map((r) => [r.name, r.value]),
      },
    ],
  };
}

function buildServices(data: ServicesReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `services-report-${data.from}-${data.to}`,
    title: "Services report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Service revenue", cmpValue(k.serviceRevenue)],
        ["Services sold", cmpValue(k.servicesSold)],
        ["Avg service value", cmpValue(k.avgServiceValue)],
        ["Unique services", cmpValue(k.uniqueServices)],
        ["Usage COGS", cmpValue(k.usageCogs)],
        ["Service gross profit", cmpValue(k.serviceGrossProfit)],
      ]),
      {
        name: "Services",
        headers: [
          "Service",
          "Category",
          "Qty",
          "Revenue",
          "Usage cost",
          "Gross profit",
          "Margin %",
          "Avg price",
          "% of service revenue",
        ],
        rows: data.detail.map((r) => [
          r.name,
          r.category ?? "",
          r.qty,
          r.revenue,
          r.usageCost,
          r.grossProfit,
          r.marginPercent,
          r.avgPrice,
          r.pctOfServiceRevenue,
        ]),
      },
    ],
  };
}

function buildCustomers(data: CustomersReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `customers-report-${data.from}-${data.to}`,
    title: "Customers report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Total customers", cmpValue(k.totalCustomers)],
        ["New customers", cmpValue(k.newCustomers)],
        ["Returning", cmpValue(k.returningCustomers)],
        ["Active", cmpValue(k.activeCustomers)],
        ["Inactive", cmpValue(k.inactiveCustomers)],
        ["Avg spend", cmpValue(k.avgSpend)],
        ["Avg visits", cmpValue(k.avgVisits)],
        ["CLV", cmpValue(k.clv)],
        ["Retention %", cmpValue(k.retentionRate)],
        ["At risk", cmpValue(k.atRisk)],
      ]),
      {
        name: "Customers",
        headers: ["Name", "Phone", "Visits", "Total spend", "Avg spend", "Segment", "Last visit"],
        rows: data.ledger.map((r) => [
          r.name,
          r.phone ?? "",
          r.visits,
          r.totalSpend,
          r.avgSpend,
          r.segment,
          r.lastVisit ?? "",
        ]),
      },
    ],
  };
}

function buildAppointments(data: AppointmentsReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `appointments-report-${data.from}-${data.to}`,
    title: "Appointments report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Total", cmpValue(k.total)],
        ["Completed", cmpValue(k.completed)],
        ["Pending", cmpValue(k.pending)],
        ["Confirmed", cmpValue(k.confirmed)],
        ["Cancelled", cmpValue(k.cancelled)],
        ["No-show", cmpValue(k.noShow)],
        ["Completion %", cmpValue(k.completionRate)],
        ["Cancellation %", cmpValue(k.cancellationRate)],
        ["No-show %", cmpValue(k.noShowRate)],
      ]),
      {
        name: "Appointments",
        headers: ["When", "Customer", "Staff", "Status", "Services", "Source"],
        rows: data.ledger.map((r) => [
          r.scheduledAt,
          r.customerName,
          r.staffName ?? "",
          r.status,
          r.services,
          r.source,
        ]),
      },
    ],
  };
}

function buildStaff(data: StaffReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `staff-report-${data.from}-${data.to}`,
    title: "Staff report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Staff revenue", cmpValue(k.staffRevenue)],
        ["Services performed", cmpValue(k.servicesPerformed)],
        ["Appointments completed", cmpValue(k.appointmentsCompleted)],
        ["Avg ticket", cmpValue(k.avgTicket)],
        ["Unassigned revenue", cmpValue(k.unassignedRevenue)],
      ]),
      {
        name: "Staff ranking",
        headers: [
          "Staff",
          "Appts",
          "Completed",
          "Cancelled",
          "No-show",
          "Completion %",
          "Linked revenue",
          "Customers",
        ],
        rows: data.ranking.map((r) => [
          r.name,
          r.appointments,
          r.completed,
          r.cancelled,
          r.noShow,
          Number(r.completionRate.toFixed(1)),
          r.linkedSalesRevenue,
          r.customersServed,
        ]),
      },
    ],
  };
}

function buildInventory(data: InventoryReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `inventory-report-${data.from}-${data.to}`,
    title: "Inventory report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Value at cost", cmpValue(k.valueAtCost)],
        ["Value at retail", cmpValue(k.valueAtRetail)],
        ["Potential profit", cmpValue(k.potentialProfit)],
        ["Units sold", cmpValue(k.unitsSold)],
        ["Low stock", cmpValue(k.lowStock)],
        ["Out of stock", cmpValue(k.outOfStock)],
        ["Product COGS", cmpValue(k.productCogs)],
        ["Product gross profit", cmpValue(k.productGrossProfit)],
      ]),
      {
        name: "Stock",
        headers: ["Product", "SKU", "Stock", "Status", "Cost value", "Retail value"],
        rows: data.products.map((p) => [
          p.name,
          p.sku ?? "",
          p.stock,
          p.status,
          p.valueAtCost,
          p.valueAtRetail,
        ]),
      },
    ],
  };
}

function buildInHouse(data: InHouseUsageReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `in-house-report-${data.from}-${data.to}`,
    title: "In-house usage report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Qty used", cmpValue(k.qtyUsed)],
        ["Usage cost", cmpValue(k.usageCost)],
        ["Stock value", cmpValue(k.stockValue)],
        ["Low stock", cmpValue(k.lowStock)],
        ["Products tracked", cmpValue(k.productsTracked)],
      ]),
      {
        name: "Products",
        headers: [
          "Product",
          "SKU",
          "Unit",
          "Remaining",
          "Used (period)",
          "Usage cost",
          "Clients left",
          "Status",
        ],
        rows: data.products.map((p) => [
          p.name,
          p.sku ?? "",
          p.unit,
          p.stockRemaining,
          p.netUsedInPeriod,
          p.usageCostInPeriod,
          p.clientsLeft ?? "",
          p.status,
        ]),
      },
    ],
  };
}

function buildProducts(data: ProductsReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `products-report-${data.from}-${data.to}`,
    title: "Products report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Revenue", cmpValue(k.revenue)],
        ["Units sold", cmpValue(k.unitsSold)],
        ["COGS", cmpValue(k.cogs)],
        ["Gross profit", cmpValue(k.grossProfit)],
        ["Margin %", cmpValue(k.margin)],
        ["Below cost count", cmpValue(k.belowCostCount)],
      ]),
      {
        name: "Products",
        headers: [
          "Product",
          "SKU",
          "Category",
          "Qty",
          "Revenue",
          "COGS",
          "Profit",
          "Margin %",
          "Stock",
          "Below cost",
        ],
        rows: data.detail.map((r) => [
          r.name,
          r.sku ?? "",
          r.category ?? "",
          r.qtySold,
          r.revenue,
          r.cogs,
          r.profit,
          r.marginPercent,
          r.currentStock,
          r.belowCost ? "YES" : "",
        ]),
      },
    ],
  };
}

function buildFinance(data: FinanceReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `finance-report-${data.from}-${data.to}`,
    title: "Finance report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Gross (subtotal)", cmpValue(k.grossRevenue)],
        ["Discounts", cmpValue(k.discounts)],
        ["Net ticket revenue", cmpValue(k.netRevenue)],
        ["Product COGS", cmpValue(k.cogs)],
        ["Gross profit", cmpValue(k.grossProfit)],
        ["Gross margin %", cmpValue(k.grossMargin)],
        ["Expenses", cmpValue(k.expenses)],
        ["Staff payments", cmpValue(k.staffPayments)],
        ["Net profit", cmpValue(k.netProfit)],
        ["Net margin %", cmpValue(k.netMargin)],
      ]),
      {
        name: "Waterfall",
        headers: ["Step", "Amount"],
        rows: data.waterfall.map((r) => [r.label, r.value]),
      },
      {
        name: "Expenses by category",
        headers: ["Category", "Amount"],
        rows: data.expensesByCategory.map((r) => [r.name, r.value]),
      },
    ],
  };
}

function buildPayments(data: PaymentsReport): ExportDocument {
  const k = data.kpis;
  return {
    filenameBase: `payments-report-${data.from}-${data.to}`,
    title: "Payments report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Total payments", cmpValue(k.totalPayments)],
        ["Cash", cmpValue(k.cash)],
        ["Card", cmpValue(k.card)],
        ["Other", cmpValue(k.other)],
        ["Discounts", cmpValue(k.discounts)],
        ["Deposit refunds", cmpValue(k.depositRefunds)],
        ["Transactions", cmpValue(k.transactionCount)],
      ]),
      {
        name: "Payments",
        headers: ["When", "Sale", "Method", "Amount", "Reference"],
        rows: data.ledger.map((r) => [r.paidAt, r.saleId, r.method, r.amount, r.reference ?? ""]),
      },
    ],
  };
}

function buildDues(data: DuesReport): ExportDocument {
  return {
    filenameBase: `dues-report-${data.from}-${data.to}`,
    title: "Customer dues report",
    subtitle: periodSubtitle(data.from, data.to, data.generatedAt),
    sheets: [
      kpiSheet("KPIs", [
        ["Total outstanding", data.kpis.totalOutstanding],
        ["Customers with due", data.kpis.customersWithDue],
        ["Invoices with due", data.kpis.invoicesWithDue],
        ["Collected today", data.kpis.collectedToday],
        ["Collected this month", data.kpis.collectedThisMonth],
        ["Overdue amount", data.kpis.overdueAmount],
      ]),
      {
        name: "Aging",
        headers: ["Bucket", "Amount", "Invoices", "Customers"],
        rows: data.aging.map((r) => [r.label, r.amount, r.invoiceCount, r.customerCount]),
      },
      {
        name: "Dues ledger",
        headers: [
          "Customer",
          "Phone",
          "Invoice",
          "Invoice date",
          "Total",
          "Paid",
          "Due",
          "Days outstanding",
          "Status",
        ],
        rows: data.ledger.map((r) => [
          r.customerName,
          r.phone ?? "",
          r.invoiceNumber ?? "",
          r.invoiceDate ?? "",
          r.total,
          r.paid,
          r.due,
          r.daysOutstanding,
          r.status,
        ]),
      },
    ],
  };
}

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

/** Build a multi-sheet export document for the active report tab. */
export function buildReportExportDocument(
  tab: ReportTabId,
  data: TabDataMap[ReportTabId]
): ExportDocument {
  switch (tab) {
    case "overall":
      return buildOverall(data as OverallReport);
    case "sales":
      return buildSales(data as SalesReport);
    case "services":
      return buildServices(data as ServicesReport);
    case "customers":
      return buildCustomers(data as CustomersReport);
    case "appointments":
      return buildAppointments(data as AppointmentsReport);
    case "staff":
      return buildStaff(data as StaffReport);
    case "inventory":
      return buildInventory(data as InventoryReport);
    case "in_house":
      return buildInHouse(data as InHouseUsageReport);
    case "products":
      return buildProducts(data as ProductsReport);
    case "finance":
      return buildFinance(data as FinanceReport);
    case "payments":
      return buildPayments(data as PaymentsReport);
    case "dues":
      return buildDues(data as DuesReport);
    default:
      throw new Error(`Unsupported report tab: ${tab satisfies never}`);
  }
}
