/**
 * Salon Cheatsheet — plain-language formulas and how each area of Beautora works.
 * Keep wording aligned with live Finances / Reports / Dashboard code.
 */

export type CheatsheetItem = {
  title: string;
  body: string;
  formula?: string;
};

export type CheatsheetSection = {
  id: string;
  label: string;
  intro: string;
  items: CheatsheetItem[];
};

export const CHEATSHEET_SECTIONS: CheatsheetSection[] = [
  {
    id: "overview",
    label: "Overview",
    intro:
      "Beautora records money when you complete a sale at POS (or finish a paid flow). Reports and Finances read the same sale tickets — they do not invent separate numbers.",
    items: [
      {
        title: "What counts as a “sale ticket”",
        body: "A completed checkout on POS: services, retail products, and/or packages. The ticket total is what the customer owes for that visit (after discount, including tax).",
      },
      {
        title: "Where numbers appear",
        body: "Dashboard = today’s snapshot. Reports = filters by date range and topic. Finances = profit, expenses, staff pay, and cash-style views for a period.",
      },
      {
        title: "Currency on screen",
        body: "Amounts follow your store country setting (e.g. Rs for Pakistan). Beautora subscription billing is separate (see Billing).",
      },
    ],
  },
  {
    id: "pos",
    label: "POS & sales",
    intro: "Checkout builds the ticket total first; then you collect cash/card or leave dues.",
    items: [
      {
        title: "Line total",
        body: "Each service or product line is price × quantity.",
        formula: "Line = unit price × qty",
      },
      {
        title: "Ticket total",
        body: "Add all lines, subtract discount, add tax. Total never goes below zero.",
        formula: "Total = max(0, subtotal − discount + tax)",
      },
      {
        title: "Amount due (open balance)",
        body: "If the guest pays less than the ticket total, the rest stays as dues on that sale (and can be collected later).",
        formula: "Amount due = max(0, total − paid + refunded)",
      },
      {
        title: "Net collected",
        body: "What you have really taken in after refunds on that ticket.",
        formula: "Net collected = paid − refunded",
      },
      {
        title: "Deposits / advances",
        body: "Online booking advances can credit a sale when approved. Advances are tracked separately and are not added again into net profit.",
      },
      {
        title: "Amend / void / refund",
        body: "Amend changes the ticket and may create additional due or a refund. Void / full refund reverse the sale for revenue views according to status rules. Partial refunds reduce “net revenue” on Reports.",
      },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    intro: "Cards on Dashboard use today’s date (store timezone) unless noted.",
    items: [
      {
        title: "Today’s sales",
        body: "Sum of ticket totals completed today (including tickets later marked void/refunded that still have a completed date). Compared to yesterday for the % change.",
        formula: "Σ sale.total (completed today)",
      },
      {
        title: "Appointments",
        body: "Count of today’s appointments. Completed vs upcoming vs cancelled/no-show use appointment status.",
      },
      {
        title: "Customers",
        body: "Total active customers in the salon; “this week” counts newly created profiles.",
      },
      {
        title: "Stock card",
        body: "If you sold retail products today, it highlights product sales and product gross profit. Otherwise it shows inventory value at cost (money tied up in stock).",
      },
      {
        title: "Today’s summary (operational overview)",
        body: "Sales, expenses, staff paid, and net profit for today — same engine as Finances for a one-day range.",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    intro:
      "Overall report KPIs for the date range you pick. Ticket totals are after discount and include tax.",
    items: [
      {
        title: "Total revenue",
        body: "Sum of completed ticket totals in the range.",
        formula: "Total revenue = Σ sale.total",
      },
      {
        title: "Net revenue",
        body: "Ticket revenue after subtracting partial refunds posted on those tickets (still-visible tickets).",
        formula: "Net revenue = Total revenue − partial refunds",
      },
      {
        title: "Avg ticket (AOV)",
        body: "Average size of a completed ticket in the range.",
        formula: "Avg ticket = Total revenue ÷ number of sales",
      },
      {
        title: "Service / product / package revenue",
        body: "Sum of line totals by item type (before allocating sale-level discounts across lines). Useful to see mix — not always identical to ticket total after discounts.",
      },
      {
        title: "Discounts",
        body: "Sum of sale-level discounts in the range.",
      },
      {
        title: "Product gross profit",
        body: "Retail product sales minus product cost of goods (qty × cost price).",
        formula: "Product GP = product retail − product COGS",
      },
      {
        title: "Deposit refunds",
        body: "Sum of online booking advances that were refunded in the range (by refund date).",
      },
    ],
  },
  {
    id: "finances",
    label: "Finances & profit",
    intro: "Finances answers: “After sales, stock cost, expenses, and staff pay — what did we keep?”",
    items: [
      {
        title: "Sales revenue",
        body: "Sum of ticket totals by completed date in the period.",
      },
      {
        title: "Operating expenses",
        body: "Amounts you enter under Finances → Expenses (rent, utilities, marketing, etc.).",
      },
      {
        title: "Staff paid",
        body: "Sum of staff payment records (salary, bonus, etc.) in the period.",
      },
      {
        title: "Product COGS",
        body: "Cost of retail products sold: quantity × product cost price.",
      },
      {
        title: "In-house usage COGS",
        body: "Cost of cream/ml (or other in-house stock) used when a service recipe runs at POS. This cost stays even if a ticket is later voided.",
      },
      {
        title: "Net profit",
        body: "Revenue after reversing voided/refunded tickets as applicable, minus partial refunds, expenses, staff pay, and both kinds of COGS. Advances collected are not added into this profit figure.",
        formula:
          "Net profit = Sales − ticket reversals − partial refunds − Expenses − Staff − Product COGS − In-house COGS",
      },
      {
        title: "Net cash flow (simplified)",
        body: "Cash-style view: money in from sales and advances, minus expenses, staff, and cash refunds.",
        formula:
          "Net cash ≈ (Sales cash + Advances) − (Expenses + Staff + cash refunds)",
      },
      {
        title: "Service gross profit",
        body: "Service revenue minus in-house usage COGS for those services.",
        formula: "Service GP = service revenue − in-house COGS",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory & in-house",
    intro: "Products can be Retail (POS), In-house (service recipes), or Both.",
    items: [
      {
        title: "Value at cost",
        body: "What you paid to have current stock on the shelf / in back bar.",
        formula: "Σ (stock qty × cost price)",
      },
      {
        title: "Value at retail",
        body: "If you sold every unit at retail price with no discount.",
        formula: "Σ (stock qty × retail price)",
      },
      {
        title: "Potential profit on hand",
        body: "Retail value minus cost value for current stock.",
        formula: "Σ stock × (retail − cost)",
      },
      {
        title: "When stock moves",
        body: "Retail sale reduces stock and posts product COGS. Service with a recipe reduces in-house stock and posts usage COGS. Stock In (inventory adjust) increases on-hand without creating revenue.",
      },
    ],
  },
  {
    id: "booking",
    label: "Booking & queue",
    intro: "Front desk tools that feed the same customers and appointments as POS.",
    items: [
      {
        title: "Appointments",
        body: "Scheduled visits with staff and services. Completing or linking to POS connects the visit to a sale.",
      },
      {
        title: "Online booking & advances",
        body: "Guests book publicly when enabled. Optional advance + screenshot → staff approve or reject. Approved advances can credit checkout.",
      },
      {
        title: "Queue",
        body: "Walk-in tokens for the floor. Does not by itself create revenue until you check out at POS.",
      },
      {
        title: "Customers",
        body: "Profiles store name, phone, history, and dues. Reception can create customers when that action is enabled for their role.",
      },
    ],
  },
  {
    id: "roles",
    label: "Roles & permissions",
    intro: "What a login can see and do is controlled under Staff → Features & actions.",
    items: [
      {
        title: "Feature On/Off",
        body: "Hides or shows a module in the sidebar (Customers, POS, Reports, etc.).",
      },
      {
        title: "Actions On/Off",
        body: "Inside a visible feature: Create, Edit, Delete, Sell, Approve deposits, etc. Admin overrides apply per role (including Receptionist).",
      },
      {
        title: "Owner",
        body: "Always has full access. Admins keep Settings and Staff permission tools so they cannot lock themselves out.",
      },
    ],
  },
];

const BILLING_SECTION_MONTHLY: CheatsheetSection = {
  id: "billing",
  label: "Beautora billing",
  intro:
    "This is your subscription to use Beautora — not salon guest checkout. Plan follows the store country in Settings.",
  items: [
    {
      title: "Trial",
      body: "New stores get a free trial of the full platform, then a short grace period before lock if unpaid.",
    },
    {
      title: "Pakistan",
      body: "After trial: Rs 3,000 per store / month via JazzCash. Upload transfer proof in Billing; SyncOps approves and unlocks 30 days.",
      formula: "Rs 3,000 / month · JazzCash",
    },
    {
      title: "Other countries",
      body: "After trial: $15 USDT on BNB Smart Chain (BEP-20) to the wallet shown in Billing. Send only USDT on BEP-20 — wrong network can lose funds. Upload proof for approval.",
      formula: "$15 USDT · BEP-20",
    },
  ],
};

const BILLING_SECTION_LIFETIME: CheatsheetSection = {
  id: "billing",
  label: "Beautora billing",
  intro:
    "This store has lifetime / complimentary access. Monthly JazzCash or USDT renewal does not apply — do not send subscription payments.",
  items: [
    {
      title: "Lifetime access",
      body: "Your salon stays fully operational without monthly renewals. Billing → Plan status shows Lifetime. Contact Beautora support only if something looks wrong.",
      formula: "No monthly fee",
    },
  ],
};

/**
 * Cheatsheet topics for the signed-in store.
 * Lifetime stores must not see JazzCash / USDT pay instructions (visibility / confusion).
 * Monthly stores must not see a “lifetime grant” pitch (SyncOps-only).
 */
export function getCheatsheetSections(options?: {
  hasLifetimeAccess?: boolean;
}): CheatsheetSection[] {
  const billing = options?.hasLifetimeAccess
    ? BILLING_SECTION_LIFETIME
    : BILLING_SECTION_MONTHLY;

  const rolesIdx = CHEATSHEET_SECTIONS.findIndex((s) => s.id === "roles");
  if (rolesIdx < 0) return [...CHEATSHEET_SECTIONS, billing];
  return [
    ...CHEATSHEET_SECTIONS.slice(0, rolesIdx),
    billing,
    ...CHEATSHEET_SECTIONS.slice(rolesIdx),
  ];
}
