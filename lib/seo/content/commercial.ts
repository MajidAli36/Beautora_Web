export type CommercialLink = { label: string; href: string };

export type CommercialPage = {
  slug: string;
  path: string;
  navLabel: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  keywords: string[];
  problems: { title: string; body: string }[];
  capabilities: { title: string; body: string }[];
  whoFor: string[];
  faqs: { question: string; answer: string }[];
  related: CommercialLink[];
};

export const COMMERCIAL_PAGES: CommercialPage[] = [
  {
    slug: "salon-management-software",
    path: "/salon-management-software",
    navLabel: "Salon management",
    title: "Salon Management, POS & Marketplace",
    description:
      "Beautora is AI-powered Salon Management, POS & Marketplace software for beauty businesses worldwide — online booking, salon POS, CRM, staff, inventory, queue, reports, and a product marketplace in one workspace.",
    h1: "Salon Management, POS & Marketplace Software",
    lead: "Run bookings, POS checkout, team, and reporting — then sell products online with Marketplace. Built for hair, beauty, spa, and barbershop operators who want clarity on the floor and online.",
    keywords: [
      "salon management software",
      "salon POS software",
      "salon marketplace",
      "beauty salon management platform",
      "AI-powered salon management",
    ],
    problems: [
      {
        title: "Scattered tools",
        body: "Bookings in one app, POS in another, an online shop somewhere else, and staff notes in chats create missed appointments and messy end-of-day totals.",
      },
      {
        title: "Front desk overload",
        body: "Walk-ins, phone calls, and online requests compete for attention. Without a queue and clear schedule, service quality slips.",
      },
      {
        title: "Weak visibility",
        body: "Owners need to know which services sell, who is on duty, and what inventory is low — without waiting for a weekend spreadsheet.",
      },
    ],
    capabilities: [
      {
        title: "Online booking + public store pages",
        body: "Guests choose services, stylists, and times. Optional public listings help new clients discover your salon.",
      },
      {
        title: "POS, sales, and dues",
        body: "Checkout services and retail, apply deposits, and keep history tied to customers and staff.",
      },
      {
        title: "Staff, attendance, and queue",
        body: "Rosters, check-in, and walk-in tokens keep the floor orderly on busy days.",
      },
      {
        title: "CRM-style customers + WhatsApp tools",
        body: "Profiles, history, feedback, and message templates so follow-ups are consistent.",
      },
      {
        title: "Inventory and reports",
        body: "Retail and in-house stock with operational reports for owners and managers.",
      },
      {
        title: "Marketplace product sales",
        body: "List products and take COD orders online — shop inventory and money stay separate from salon POS.",
      },
    ],
    whoFor: [
      "Independent salons and multi-chair studios",
      "Beauty groups opening additional locations as separate stores",
      "Barbershops and spas that need booking + POS together",
      "Stores that want to sell products online without a second commerce stack",
    ],
    faqs: [
      {
        question: "Is Beautora only for Pakistan?",
        answer:
          "No. Beautora is positioned for beauty businesses worldwide. Local payment options and currency display depend on store settings and region.",
      },
      {
        question: "What makes Beautora “AI-powered”?",
        answer:
          "Beautora includes AI-assisted help on the marketing site and product workflows that automate scheduling, floor ops, and reporting. We do not claim a fully autonomous voice AI receptionist today.",
      },
      {
        question: "Can I try before paying?",
        answer: "Yes. New stores start with a free trial. See the pricing page for current plan details.",
      },
    ],
    related: [
      { label: "Salon booking software", href: "/salon-booking-software" },
      { label: "Salon POS", href: "/salon-pos" },
      { label: "Salon CRM", href: "/salon-crm" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    slug: "salon-booking-software",
    path: "/salon-booking-software",
    navLabel: "Booking",
    title: "Salon Booking Software",
    description:
      "Online salon booking software from Beautora — services, stylists, schedules, advances, and public booking pages for beauty businesses worldwide.",
    h1: "Salon Booking Software",
    lead: "Give clients a calm online booking experience while your team keeps control of availability, deposits, and day-of arrivals.",
    keywords: ["salon booking software", "online salon booking", "appointment booking for salons"],
    problems: [
      {
        title: "Double bookings",
        body: "When calendars are informal, two guests can land on the same stylist at the same time.",
      },
      {
        title: "No-shows",
        body: "Without clear confirmation and optional advances, empty chairs still cost the salon.",
      },
      {
        title: "After-hours demand",
        body: "Clients want to book at night. Staff should not live inside WhatsApp to capture that demand.",
      },
    ],
    capabilities: [
      {
        title: "Public booking pages",
        body: "Each store can publish a booking URL with services, durations, and stylist choice.",
      },
      {
        title: "Schedules that matter",
        body: "Staff schedules and service duration drive real availability — not a static calendar screenshot.",
      },
      {
        title: "Optional advances",
        body: "Collect an advance with payment proof when your policies require it, then approve on the floor.",
      },
      {
        title: "Directory discovery",
        body: "Optional public store listings help guests find and book salons through Beautora’s directory.",
      },
    ],
    whoFor: ["Salons moving off phone-only booking", "Studios with multiple stylists", "Owners who want fewer WhatsApp threads"],
    faqs: [
      {
        question: "Do guests need an app?",
        answer: "No. Guests book in the browser on your public booking page.",
      },
      {
        question: "Can I turn booking off?",
        answer: "Yes. Public booking and public listing are controlled in store settings.",
      },
    ],
    related: [
      { label: "Salon management software", href: "/salon-management-software" },
      { label: "Salon staff management", href: "/salon-staff-management" },
      { label: "Browse stores", href: "/stores" },
    ],
  },
  {
    slug: "salon-pos",
    path: "/salon-pos",
    navLabel: "POS",
    title: "Salon POS Software",
    description:
      "Salon POS software from Beautora — checkout services and retail, take payments, link staff, and keep sales history. Part of Salon Management; Marketplace shop sales stay separate.",
    h1: "Salon POS Software",
    lead: "Checkout that matches how salons actually sell: services, retail, deposits, and staff attribution — without a separate retail-only till. Online Marketplace orders stay in their own ledger.",
    keywords: [
      "salon POS",
      "beauty salon point of sale",
      "salon checkout software",
      "salon POS and marketplace",
    ],
    problems: [
      {
        title: "Disconnected tills",
        body: "When POS ignores appointments, deposits and service history get lost at payment time.",
      },
      {
        title: "Unclear staff credit",
        body: "Commission conversations fail when sales are not tied to the people who delivered the work.",
      },
      {
        title: "Slow end-of-day",
        body: "Owners need clean sales history, not photos of handwritten tickets.",
      },
    ],
    capabilities: [
      {
        title: "Service + retail checkout",
        body: "Sell appointments and products in one flow with discounts, tax settings, and notes.",
      },
      {
        title: "Staff on the sale",
        body: "Credit one or more stylists so reporting reflects how the floor really works.",
      },
      {
        title: "Thermal receipts",
        body: "Print-friendly receipts for the counter, with clear money formatting.",
      },
      {
        title: "Sales controls",
        body: "Amend, refund, and dues workflows for managers who need operational flexibility.",
      },
    ],
    whoFor: ["Busy front desks", "Salons with retail shelves", "Teams that track stylist performance"],
    faqs: [
      {
        question: "Does POS require a special device?",
        answer:
          "Beautora POS runs in the browser. Optional printers and cash drawers connect through the device agent when registered.",
      },
    ],
    related: [
      { label: "Salon inventory", href: "/salon-inventory-management" },
      { label: "Salon CRM", href: "/salon-crm" },
      { label: "Reports", href: "/features" },
    ],
  },
  {
    slug: "salon-crm",
    path: "/salon-crm",
    navLabel: "CRM",
    title: "Salon CRM Software",
    description:
      "Salon CRM from Beautora — customer profiles, visit history, feedback, and follow-up tools for beauty businesses that want lasting client relationships.",
    h1: "Salon CRM for Beauty Businesses",
    lead: "Know who walked in, what they booked, what they bought, and how they rated the visit — without building a separate CRM stack.",
    keywords: ["salon CRM", "beauty salon customer management", "salon client profiles"],
    problems: [
      {
        title: "Phone books ≠ relationships",
        body: "A contact list without history cannot personalize service or recover lapsed clients.",
      },
      {
        title: "Feedback lost in chats",
        body: "Ratings and comments need a place that managers can review and act on.",
      },
    ],
    capabilities: [
      {
        title: "Customer profiles",
        body: "Names, phones, tags, and visit context kept with the salon’s operational data.",
      },
      {
        title: "History that matters",
        body: "Appointments and sales stay connected so the next visit starts informed.",
      },
      {
        title: "Feedback",
        body: "Capture guest ratings and comments, optionally credited to staff.",
      },
      {
        title: "WhatsApp follow-ups",
        body: "Template-based messages so outreach is consistent (opens WhatsApp with prepared text).",
      },
    ],
    whoFor: ["Retention-focused salons", "Bridal and repeat-service businesses", "Teams that review guest feedback weekly"],
    faqs: [
      {
        question: "Is this a full marketing automation CRM?",
        answer:
          "Beautora focuses on operational CRM: profiles, history, feedback, and messaging tools. It is not a bulk email/SMS blast suite.",
      },
    ],
    related: [
      { label: "Salon marketing tools", href: "/salon-marketing" },
      { label: "Salon booking", href: "/salon-booking-software" },
      { label: "Features", href: "/features" },
    ],
  },
  {
    slug: "salon-staff-management",
    path: "/salon-staff-management",
    navLabel: "Staff",
    title: "Salon Staff Management Software",
    description:
      "Salon staff management from Beautora — profiles, schedules, attendance, roles, and stylist dashboards for beauty teams worldwide.",
    h1: "Salon Staff Management",
    lead: "Give every stylist a clear schedule and every owner a clear view of who is on duty, booked, and performing.",
    keywords: ["salon staff management", "stylist scheduling software", "salon attendance"],
    problems: [
      {
        title: "Who is free?",
        body: "Without schedules tied to booking, front desk guesses — and guests wait.",
      },
      {
        title: "Attendance gaps",
        body: "Payroll and accountability need check-ins that are harder to dispute than a verbal “I was here.”",
      },
    ],
    capabilities: [
      {
        title: "Staff profiles & roles",
        body: "Salon profiles plus app logins with role-based access for desk, managers, and owners.",
      },
      {
        title: "Schedules for booking",
        body: "Weekly availability drives online booking so guests only see real openings.",
      },
      {
        title: "Attendance",
        body: "Check-in flows (including kiosk options) feed duty and presence reporting.",
      },
      {
        title: "Staff self-dashboard",
        body: "Linked staff can see their own appointments — today, tomorrow, upcoming, and monthly history.",
      },
    ],
    whoFor: ["Multi-stylist floors", "Salons using attendance devices", "Owners who share performance with the team"],
    faqs: [
      {
        question: "Can staff see only their own schedule?",
        answer:
          "Yes. When a login is linked to a salon staff profile, that person can open their own staff dashboard without full team admin access.",
      },
    ],
    related: [
      { label: "Salon booking", href: "/salon-booking-software" },
      { label: "Salon management", href: "/salon-management-software" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    slug: "salon-inventory-management",
    path: "/salon-inventory-management",
    navLabel: "Inventory",
    title: "Salon Inventory Management",
    description:
      "Salon inventory management from Beautora — retail and in-house stock, POS linkage, and stock visibility for beauty businesses.",
    h1: "Salon Inventory Management",
    lead: "Track what you sell at the desk and what you consume behind the chair — without treating a salon like a warehouse ERP.",
    keywords: ["salon inventory management", "beauty salon stock software", "salon product inventory"],
    problems: [
      {
        title: "Retail blind spots",
        body: "Shelves empty mid-week when stock is not tied to POS.",
      },
      {
        title: "Back-bar waste",
        body: "In-house products disappear without usage context.",
      },
    ],
    capabilities: [
      {
        title: "Retail + in-house products",
        body: "Classify products for sale, back-bar, or both.",
      },
      {
        title: "Stock movements",
        body: "Stock-in and operational summaries for managers.",
      },
      {
        title: "POS connection",
        body: "Retail sold at checkout reduces guesswork in end-of-day counts.",
      },
    ],
    whoFor: ["Salons with retail walls", "Color-heavy studios tracking back-bar", "Owners watching COGS"],
    faqs: [
      {
        question: "Does Beautora include supplier purchase orders?",
        answer:
          "Inventory today focuses on stock on hand and usage. Formal supplier PO workflows are not the core of the current product.",
      },
    ],
    related: [
      { label: "Salon POS", href: "/salon-pos" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    slug: "salon-marketing",
    path: "/salon-marketing",
    navLabel: "Marketing",
    title: "Salon Marketing Tools",
    description:
      "Salon marketing tools in Beautora — public store discovery, booking pages, feedback, and WhatsApp message templates for beauty businesses.",
    h1: "Salon Marketing Tools",
    lead: "Grow through discoverable store pages, smoother booking, better reviews capture, and consistent WhatsApp follow-ups — without pretending to be a full ad platform.",
    keywords: ["salon marketing software", "salon WhatsApp marketing", "salon online presence"],
    problems: [
      {
        title: "Invisible online",
        body: "Great floors still lose guests if booking and discovery are hard.",
      },
      {
        title: "Inconsistent follow-up",
        body: "Every stylist writes a different message. Templates keep tone consistent.",
      },
    ],
    capabilities: [
      {
        title: "Public store listings",
        body: "Appear in Beautora’s directory when listing is enabled.",
      },
      {
        title: "Booking as conversion",
        body: "Turn interest into a scheduled visit with a public booking page.",
      },
      {
        title: "Feedback capture",
        body: "Collect ratings that managers can review.",
      },
      {
        title: "WhatsApp templates",
        body: "Prepare messages and open WhatsApp with the text ready to send.",
      },
    ],
    whoFor: ["Salons building an online presence", "Teams that follow up after visits", "Owners who care about reviews"],
    faqs: [
      {
        question: "Does Beautora send WhatsApp automatically via Business API?",
        answer:
          "Current WhatsApp tools prepare messages for sending in WhatsApp. Automated Business API delivery is not claimed as a shipped feature.",
      },
    ],
    related: [
      { label: "Salon CRM", href: "/salon-crm" },
      { label: "Stores directory", href: "/stores" },
      { label: "Salon booking", href: "/salon-booking-software" },
    ],
  },
  {
    slug: "salon-ai",
    path: "/salon-ai",
    navLabel: "Salon AI",
    title: "AI for Salon Management",
    description:
      "Learn how Beautora uses AI-assisted help and intelligent salon workflows — honest AI for salon management, not hype.",
    h1: "AI for Salon Management",
    lead: "Beautora combines practical salon automation with AI-assisted guidance. We prioritize useful workflows over exaggerated “AI runs your salon alone” claims.",
    keywords: ["AI salon software", "AI salon management", "beauty business AI tools"],
    problems: [
      {
        title: "AI hype vs floor reality",
        body: "Owners need software that books, checks out, and reports — not demos that cannot run a Saturday rush.",
      },
    ],
    capabilities: [
      {
        title: "AI-assisted help",
        body: "The public Beautora assistant can answer product questions using a curated knowledge base, with optional AI polishing when configured.",
      },
      {
        title: "Intelligent operations",
        body: "Scheduling rules, queue, POS attribution, and staff dashboards reduce manual coordination — the kind of “smart” operators feel every day.",
      },
      {
        title: "Roadmap honesty",
        body: "Deeper AI assistants will expand over time. We will not mark fictional voice agents as live product.",
      },
    ],
    whoFor: ["Owners evaluating AI salon tools carefully", "Teams that want automation with clear boundaries"],
    faqs: [
      {
        question: "Is Beautora fully autonomous AI?",
        answer:
          "No. Beautora is Salon Management, POS & Marketplace software with AI-assisted help and strong operational automation. Humans still run the floor.",
      },
    ],
    related: [
      { label: "AI receptionist (honest overview)", href: "/ai-receptionist" },
      { label: "Salon management software", href: "/salon-management-software" },
      { label: "Features", href: "/features" },
    ],
  },
  {
    slug: "ai-receptionist",
    path: "/ai-receptionist",
    navLabel: "AI receptionist",
    title: "AI Receptionist for Salons",
    description:
      "What an AI receptionist means for salons — and how Beautora handles online booking, FAQs, and front-desk load today without fake voice-AI claims.",
    h1: "AI Receptionist for Salons",
    lead: "An “AI receptionist” should reduce front-desk load. Beautora does that today with online booking, clear schedules, and AI-assisted answers — not a fictional phone agent we do not ship.",
    keywords: ["AI receptionist salon", "salon virtual receptionist", "automated salon booking desk"],
    problems: [
      {
        title: "Front desk is a bottleneck",
        body: "Calls and walk-ins stack up while stylists are mid-service.",
      },
      {
        title: "After-hours questions",
        body: "Guests ask about prices and availability when nobody is at the desk.",
      },
    ],
    capabilities: [
      {
        title: "Self-serve booking",
        body: "Guests book services and stylists online — the highest-leverage “receptionist” automation most salons need first.",
      },
      {
        title: "AI-assisted Q&A",
        body: "Beautora’s site assistant helps visitors understand the product; salons still own guest communications on their channels.",
      },
      {
        title: "Queue + appointments",
        body: "Walk-ins and scheduled visits stay organized so the desk spends less time firefighting.",
      },
    ],
    whoFor: ["Salons drowning in phone booking", "Studios ready for self-serve scheduling first"],
    faqs: [
      {
        question: "Does Beautora answer phone calls with AI today?",
        answer:
          "No. We do not currently offer an autonomous voice AI that answers your salon phone line. Online booking and assisted help are the honest starting point.",
      },
    ],
    related: [
      { label: "Salon booking software", href: "/salon-booking-software" },
      { label: "Salon AI", href: "/salon-ai" },
      { label: "Start free", href: "/signup" },
    ],
  },
];

export function getCommercialPage(slug: string): CommercialPage | undefined {
  return COMMERCIAL_PAGES.find((p) => p.slug === slug);
}

export function getAllCommercialPaths(): string[] {
  return COMMERCIAL_PAGES.map((p) => p.path);
}
