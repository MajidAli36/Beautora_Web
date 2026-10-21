/**
 * Beautora marketing help knowledge base — full platform coverage.
 * Keep answers factual; the site assistant must not invent features.
 */

import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export type HelpArticle = {
  id: string;
  title: string;
  keywords: string[];
  answer: string;
  links?: { label: string; href: string }[];
};

export const HELP_SUGGESTIONS = [
  "What is Beautora?",
  "List all features",
  "How much does it cost?",
  "How does online booking work?",
  "How does POS checkout work?",
  "What is Marketplace?",
  "How do I start a free trial?",
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "what-is-beautora",
    title: "What is Beautora?",
    keywords: [
      "what is beautora",
      "beautora",
      "salon software",
      "salon management",
      "salon POS",
      "marketplace",
      "salon os",
      "operating system",
      "platform",
      "product",
      "about beautora",
      "what do you do",
      "explain beautora",
    ],
    answer: `${SYNCOPS.name} is Salon Management, POS & Marketplace from ${SYNCOPS.builder.name}. One workspace for the whole store: online booking, appointments, walk-in queue, salon POS & sales, services/products/chairs, staff & attendance, customers, WhatsApp, feedback, inventory (retail + in-house), reports, finances, billing, settings — plus a separate Marketplace to list products and take COD orders online (shop stock and money stay separate from salon POS). It replaces juggling WhatsApp, notebooks, spreadsheets, a separate till, and a random online shop.`,
    links: [
      { label: "Platform", href: "/salon-management-software" },
      { label: "Marketplace shop", href: "/shop" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    id: "all-features",
    title: "All features overview",
    keywords: [
      "all features",
      "list features",
      "every feature",
      "what can it do",
      "full features",
      "complete features",
      "modules",
      "everything included",
      "capabilities",
      "what is included",
      "feature list",
      "tell me everything",
      "overview",
    ],
    answer: `Beautora includes Salon Management: Dashboard · Customers · Appointments (in-house + online + deposit approvals) · Queue (walk-in tokens) · POS · Sales (amend / void / refund / dues) · Services & packages · Products (retail) · In-house stock (cream/ml recipes) · Chairs · Staff & roles · Attendance (fingerprint kiosk) · Devices (printer, drawer, token, attendance) · Reports · Finances (expenses, staff pay, COGS, advances) · WhatsApp templates · Feedback ratings · Billing (trial / USDT) · Settings. Plus Marketplace: product listings, COD shop orders, marketplace stock, and seller tools — separate from salon POS inventory and finances. Guests book on your public store page and shop on /shop. Native mobile/desktop apps are Coming Soon — the web app is live today.`,
    links: [
      { label: "Platform modules", href: "/salon-management-software" },
      { label: "Marketplace shop", href: "/shop" },
      { label: "Pricing", href: "/pricing" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    id: "who-builds",
    title: "Who builds Beautora?",
    keywords: [
      "who builds",
      "syncops",
      "founder",
      "ceo",
      "majid",
      "company",
      "maker",
      "studio",
      "who made",
      "owner of beautora",
    ],
    answer: `${SYNCOPS.name} is a ${SYNCOPS.builder.name} product (${SYNCOPS.builder.domain}), founded by ${SYNCOPS.ceo.name} (${SYNCOPS.ceo.role}). Studio: ${SYNCOPS.builder.url}.`,
    links: [
      { label: "SyncOps", href: "/syncops" },
      { label: "Founder", href: "/ceo" },
    ],
  },
  {
    id: "pricing",
    title: "Pricing, trial & billing",
    keywords: [
      "price",
      "pricing",
      "cost",
      "how much",
      "fee",
      "monthly",
      "subscription",
      "trial",
      "free",
      "rs",
      "pkr",
      "usdt",
      "usd",
      "asia",
      "billing",
      "renew",
      "pay",
      "lock",
      "grace",
      "plan",
    ],
    answer: `Beautora starts with a free trial (no card required), then regional USDT plans per store on BNB Smart Chain (BEP-20). Current trial length, Asia vs elsewhere rates, and payment steps are on the Pricing page — that is the single public source for dollar amounts. SyncOps can also grant lifetime access from Platform admin. After a paid period ends there is a short ${SUBSCRIPTION.graceDays}-day grace before lock.`,
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    id: "getting-started",
    title: "How to start / onboarding",
    keywords: [
      "start",
      "signup",
      "sign up",
      "register",
      "create account",
      "onboarding",
      "get started",
      "begin",
      "setup",
      "open store",
      "guide",
      "tutorial",
    ],
    answer: `1) Sign up and create your salon (name, city, country). 2) Use the in-app Getting Started guide: Services → Products → Customers → Queue → POS → WhatsApp & feedback → Appointments & online booking → Reports. 3) Invite your team with roles. New stores get a free trial on the full platform — see Pricing for trial length and renewals.`,
    links: [
      { label: "Start free", href: "/signup" },
      { label: "Pricing", href: "/pricing" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    keywords: ["dashboard", "home", "today sales", "overview", "kpi"],
    answer:
      "The Dashboard shows today’s sales vs yesterday, appointments (completed/upcoming), customers, stock sold or inventory value, revenue charts, service performance, stock alerts, and quick actions so owners see the day at a glance.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "customers",
    title: "Customers",
    keywords: [
      "customer",
      "clients",
      "client profile",
      "vip",
      "statement",
      "dues",
      "customer history",
      "crm",
    ],
    answer:
      "Customers stores profiles (name, phone, tags like VIP/new), visit and sales history, outstanding dues, and a printable customer statement. You can create customers in the Customers module or automatically when booking / checking out at POS. Account payments can settle past dues.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "appointments",
    title: "Appointments hub",
    keywords: [
      "appointment",
      "appointments",
      "schedule",
      "in-house booking",
      "reception booking",
      "check in",
      "no show",
      "calendar",
      "day schedule",
    ],
    answer:
      "Appointments is one hub: In-house (staff bookings), Online (confirmed web bookings), Incoming (pending advances to approve), History, and Setup (public booking, advances, staff online flags, weekly schedules). Reception can check-in, mark no-show, collect advance, open POS, or cancel.",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Platform", href: "/salon-management-software" },
    ],
  },
  {
    id: "online-booking",
    title: "Online booking",
    keywords: [
      "online booking",
      "book online",
      "public booking",
      "client book",
      "guest booking",
      "book page",
      "advance",
      "deposit",
      "payment proof",
      "store page",
      "booking url",
    ],
    answer:
      "Guests book on your public page (/book/your-slug): services → stylist → date/time. Availability follows staff schedules and service duration. You can require an advance (fixed Rs amount or % of services — fixed wins if both set), show JazzCash/bank accounts from Settings, and collect a payment screenshot. Staff approve or reject pending advances under Incoming. Public listing on /stores is a separate Settings toggle from online booking itself.",
    links: [
      { label: "Browse stores", href: "/stores" },
      { label: "Platform", href: "/salon-management-software" },
    ],
  },
  {
    id: "deposits",
    title: "Advances & deposits",
    keywords: [
      "deposit",
      "advance payment",
      "booking advance",
      "approve deposit",
      "refund deposit",
      "advance credit",
    ],
    answer:
      "Advances can be taken at online booking (with proof) or at reception (cash/card/other). Pending proofs await approval. Approved advances apply as credit at POS checkout. You can refund/revert advances when needed; cash advances can open the cash drawer.",
    links: [{ label: "Pricing", href: "/pricing" }],
  },
  {
    id: "queue",
    title: "Queue & walk-ins",
    keywords: [
      "queue",
      "token",
      "walk-in",
      "wait time",
      "serving",
      "walk in",
      "token print",
    ],
    answer:
      "Queue issues walk-in tokens with customer (or walk-in name), optional staff and chair, and token time. Update serving/waiting status, print thermal tokens, and keep the floor ordered without paper tickets. Chairs from Catalog appear here for assignment.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "pos",
    title: "POS & checkout",
    keywords: [
      "pos",
      "point of sale",
      "checkout",
      "cart",
      "tender",
      "cash",
      "card",
      "bill customer",
      "sell",
      "cashier",
    ],
    answer:
      "POS builds a cart of services, retail products, and packages; attributes multi-staff; links an open appointment; applies deposit credit; supports discount/tax; takes cash/card/other (including partial pay and unpaid dues with permission); can collect prior due invoices in the same flow; previews in-house usage (cream/ml) before deducting stock; prints receipts; opens the cash drawer; or marks no-show without billing. Marketplace shop sales are separate — they do not mix into salon POS stock or finances.",
    links: [
      { label: "Platform", href: "/salon-management-software" },
      { label: "Marketplace shop", href: "/shop" },
    ],
  },
  {
    id: "marketplace",
    title: "Marketplace & online product selling",
    keywords: [
      "marketplace",
      "sell products online",
      "cod",
      "cash on delivery",
      "online shop",
      "product marketplace",
      "beautora shop",
      "seller",
      "commerce",
    ],
    answer:
      "Beautora Marketplace lets stores and sellers list products and take COD orders on the public /shop experience. Marketplace inventory, orders, and payouts stay separate from salon POS products and finances. Switch between Salon Management and Marketplace in the app mode switcher. Platform moderation may review listings.",
    links: [
      { label: "Marketplace shop", href: "/shop" },
      { label: "Videos", href: "/videos" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    id: "sales",
    title: "Sales, amend, void, refund",
    keywords: [
      "sales",
      "invoice",
      "receipt",
      "amend",
      "edit sale",
      "void",
      "refund",
      "partial refund",
      "receive payment",
      "dues",
      "unpaid",
    ],
    answer:
      "Sales lists invoices. You can print receipts, receive payment on dues, amend a completed ticket (lines, inventory, and money reconciled), void an invoice (retail stock restored; appointment can be rebilled), or refund partially/fully. Full refund restores retail stock; in-house cream/ml already used stays deducted. Soft-deleted invoices leave revenue reports.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "services",
    title: "Services & packages",
    keywords: [
      "service",
      "services",
      "package",
      "menu",
      "duration",
      "service price",
      "catalog services",
      "recipe",
    ],
    answer:
      "Services have name, price, and duration for booking and POS. Organize with categories. Packages bundle services at a package price for POS. You can link in-house stock recipes so cream/ml auto-deducts when the service is sold while the guest pays the service price.",
    links: [{ label: "How it works", href: "/how-it-works" }],
  },
  {
    id: "products",
    title: "Products & retail stock",
    keywords: [
      "product",
      "products",
      "retail",
      "sell product",
      "sku",
      "stock quantity",
      "cogs",
      "inventory retail",
      "low stock",
    ],
    answer:
      "Products can be RETAIL (sold at POS), IN_HOUSE (back-bar only), or BOTH. Retail tracks stock quantity, retail price, and cost for COGS. Stock-in and inventory summaries are available; low stock appears on the Dashboard.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "in-house",
    title: "In-house / back-bar stock",
    keywords: [
      "in-house",
      "back bar",
      "cream",
      "wax",
      "ml",
      "usage",
      "consumable",
      "recipe stock",
    ],
    answer:
      "In-house tracks back-bar cream, wax, spray, etc. Link recipes to services so usage deducts automatically at checkout. View remaining stock and full movement history. On void/full refund, retail is restored but in-house usage stays written off (product already used on the client).",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "chairs",
    title: "Chairs / stations",
    keywords: ["chair", "chairs", "station", "stations", "seat"],
    answer:
      "Chairs are floor stations you add under Catalog. They show on the Queue so walk-ins and tokens can be assigned to a chair.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "staff",
    title: "Staff, roles & permissions",
    keywords: [
      "staff",
      "stylist",
      "team",
      "role",
      "roles",
      "permission",
      "invite",
      "owner",
      "manager",
      "cashier",
      "receptionist",
      "login access",
      "roster",
    ],
    answer:
      "Staff covers salon roster (profiles, job title, PIN, thumb enrollment, online-booking flag) and app logins. Roles: Owner, Admin, Manager, Cashier, Receptionist, Staff — with sidebar visibility and granular actions (create, void, approve deposits, etc.). Weekly schedules drive booking availability.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "attendance",
    title: "Attendance",
    keywords: [
      "attendance",
      "fingerprint",
      "thumb",
      "check in",
      "check-in",
      "kiosk",
      "hours",
      "punch",
    ],
    answer:
      "Attendance supports fingerprint/thumb enrollment and an entrance kiosk, plus manual check-in. Review hours by date range. Method labels show thumb vs manual.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "devices",
    title: "Devices (printer, drawer, kiosk)",
    keywords: [
      "device",
      "devices",
      "printer",
      "receipt printer",
      "cash drawer",
      "token kiosk",
      "attendance terminal",
      "hardware",
      "agent",
    ],
    answer:
      "Devices registers attendance terminals, cash drawers, receipt printers, and token kiosks — manually with an API key or via auto-register. A small agent on the POS PC (`npm run device:agent`) drives printer and drawer commands from Beautora.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "reports",
    title: "Reports",
    keywords: [
      "report",
      "reports",
      "analytics",
      "csv",
      "sales report",
      "staff report",
      "inventory report",
      "export",
    ],
    answer:
      "Reports covers Overall, Sales, Services, Customers, Appointments, Staff, Inventory, In-house, Products, Finance, Payments, and Customer dues. Use date presets (today, week, month, year, custom) and export CSV from Overall.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "finances",
    title: "Finances",
    keywords: [
      "finance",
      "finances",
      "expense",
      "expenses",
      "profit",
      "net profit",
      "cash flow",
      "staff payment",
      "salary",
      "payroll",
      "money",
      "cogs",
    ],
    answer:
      "Finances shows ticket revenue, advances, product COGS, in-house usage COGS, operating expenses, staff payments (salary, advance, bonus), net profit, and net cash flow for a chosen period. Record expenses (rent, utilities, supplies, marketing, etc.) and staff payouts. Inventory panels show stock value.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    keywords: [
      "whatsapp",
      "message",
      "template",
      "follow up",
      "sms",
      "chat customer",
    ],
    answer:
      "WhatsApp in Beautora manages templates with placeholders (name, salon, phone, address). Pick a customer, render the message, and open WhatsApp with the text ready — you send from WhatsApp. Useful after sales or feedback.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "feedback",
    title: "Customer feedback",
    keywords: [
      "feedback",
      "rating",
      "review",
      "nps",
      "satisfaction",
      "score",
    ],
    answer:
      "Feedback collects multi-dimension ratings (overall, behaviour, expertise, service quality, cleanliness, value, wait time) for registered customers or walk-ins, with optional stylist credit. Browse averages, low scores, and recent reviews.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "settings",
    title: "Settings",
    keywords: [
      "settings",
      "store profile",
      "business hours",
      "payment account",
      "slug",
      "public listing",
      "audit log",
      "deleted records",
      "country",
      "currency",
    ],
    answer:
      "Settings covers store profile (name, slug, contact, country — country drives currency display), business hours (reception + online slots), payment accounts for advance instructions, public listing toggle, booking URL, integrations, audit log, and a deleted-records restore panel. Staff permissions are managed under Staff.",
    links: [{ label: "Platform", href: "/salon-management-software" }],
  },
  {
    id: "roles-security",
    title: "Team access & security",
    keywords: [
      "security",
      "access control",
      "permission denied",
      "who can void",
      "multi user",
      "login",
    ],
    answer:
      "Each teammate gets an app login with a role. Owners/admins control which sidebar modules and actions each role can use (e.g. only managers void sales or approve deposits). Salon data is scoped per organization — stores do not see each other’s data.",
    links: [
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
  {
    id: "stores-directory",
    title: "Public stores directory",
    keywords: [
      "stores",
      "directory",
      "find salon",
      "listed salons",
      "search salon",
    ],
    answer:
      "The public Stores directory lets guests search live Beautora salons by name/city, open a store page (menu, team, contact), and book when public booking is enabled.",
    links: [{ label: "Browse stores", href: "/stores" }],
  },
  {
    id: "apps",
    title: "Mobile & desktop apps",
    keywords: [
      "app",
      "apps",
      "android",
      "ios",
      "mobile",
      "desktop",
      "windows",
      "mac",
      "download",
      "coming soon",
    ],
    answer:
      "Native mobile (iOS/Android) and desktop (Windows/macOS) apps are Coming Soon. Today the full Beautora platform runs in the browser on phone and computer with the same salon login.",
    links: [{ label: "Apps", href: "/apps" }],
  },
  {
    id: "partner",
    title: "Partner / referral program",
    keywords: [
      "partner",
      "affiliate",
      "referral",
      "reseller",
      "commission",
      "earn",
    ],
    answer: `Partners get a personal referral link. When a referred salon pays its first subscription, that first month credits the partner (not renewals). Regional plan amounts are on the Pricing page. Apply with email + username; SyncOps approves before the link goes live. Track stores and earnings in the partner dashboard.`,
    links: [
      { label: "Become a partner", href: "/partner" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    id: "contact",
    title: "Contact & support",
    keywords: [
      "contact",
      "support",
      "help desk",
      "email",
      "phone",
      "call",
      "human",
      "talk to someone",
    ],
    answer: `Platform questions: use this assistant. Account or billing help: email ${SYNCOPS.email} or call ${SYNCOPS.phoneDisplay}. Contact page has the same details.`,
    links: [
      { label: "Contact", href: "/contact" },
      { label: "About", href: "/about" },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & terms",
    keywords: ["privacy", "data", "gdpr", "terms", "legal", "policy"],
    answer:
      "Each salon’s operational data (customers, bookings, sales, staff) stays scoped to that organization. See Privacy Policy and Terms for how Beautora/SyncOps handle information.",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    id: "login",
    title: "Login & access",
    keywords: [
      "login",
      "log in",
      "sign in",
      "access dashboard",
      "forgot",
      "password",
    ],
    answer:
      "Owners and staff sign in at Login to open the Beautora dashboard. New salons use Sign up, then onboarding. Password reset follows the auth email flow configured for Beautora.",
    links: [
      { label: "Login", href: "/login" },
      { label: "Sign up", href: "/signup" },
    ],
  },
  {
    id: "multi-store",
    title: "Per-store pricing",
    keywords: [
      "multi store",
      "multiple stores",
      "branch",
      "locations",
      "per store",
      "another salon",
    ],
    answer: `Beautora bills per store after trial via USDT (regional plans). Current rates are on the Pricing page. Each salon organization has its own catalog, team, bookings, and finances. Open another store as a separate Beautora organization if you run multiple locations.`,
    links: [{ label: "Pricing", href: "/pricing" }],
  },
  {
    id: "languages-currency",
    title: "Country & currency",
    keywords: [
      "currency",
      "pkr",
      "rupee",
      "country",
      "pakistan",
      "language",
      "urdu",
    ],
    answer:
      "During onboarding / Settings you set the store country. Beautora formats salon money with that country’s currency (Pakistan → PKR, India → INR, UAE → AED, USA → USD, and so on). Subscription billing remains USDT with regional rates selected automatically from the store country — see Pricing for current amounts.",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Start free", href: "/signup" },
    ],
  },
];

export function getHelpSystemPrompt(): string {
  const digest = HELP_ARTICLES.map((a) => `### ${a.title}\n${a.answer}`).join(
    "\n\n"
  );
  return [
    `You are the Beautora site assistant for ${SYNCOPS.url}.`,
    "Answer ONLY using the knowledge below. If unknown, say so and point to Contact or Signup.",
    "Be clear and helpful (2–6 short sentences). Never invent prices, modules, or integrations. For dollar amounts and plan rates, point users to /pricing — do not quote specific monthly fees from memory.",
    `Brand: ${SYNCOPS.name} by ${SYNCOPS.builder.name}. Support: ${SYNCOPS.email}, ${SYNCOPS.phoneDisplay}.`,
    "",
    "## Knowledge",
    digest,
  ].join("\n");
}
