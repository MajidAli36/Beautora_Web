"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "overview",
    label: "Overview",
    title: "Today at a glance",
    caption:
      "Floor status, revenue pulse, and what needs attention — without leaving the home screen.",
  },
  {
    id: "booking",
    label: "Online booking",
    title: "Clients book themselves",
    caption:
      "Public store page with services, stylists, and slots — optional advance payment when you need it.",
  },
  {
    id: "appointments",
    label: "Appointments",
    title: "The day on a timeline",
    caption: "Confirmed visits, waiting guests, and open slots so the chair stays filled.",
  },
  {
    id: "queue",
    label: "Queue",
    title: "Walk-ins without chaos",
    caption: "Issue tokens, assign chairs, and keep the floor ordered when bookings stack up.",
  },
  {
    id: "pos",
    label: "POS",
    title: "Checkout that matches the floor",
    caption: "Services, retail, and staff attribution in a single sale — ready for end-of-day reports.",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    title: "Sell products online",
    caption:
      "List products, take COD orders, and keep marketplace stock separate from salon POS finances.",
  },
  {
    id: "sales",
    label: "Sales",
    title: "Invoice history you can trust",
    caption: "Every completed sale stays searchable — amend, refund, or review when something changes.",
  },
  {
    id: "customers",
    label: "Customers",
    title: "History that travels with them",
    caption: "Profiles, visits, tags, and notes — not a scattered list of phone numbers.",
  },
  {
    id: "services",
    label: "Services",
    title: "Catalog priced and timed",
    caption: "Services and packages ready for booking and POS, with duration and price under control.",
  },
  {
    id: "products",
    label: "Products",
    title: "Retail on the same floor",
    caption: "Stock levels, categories, and checkout — retail that lives next to your services.",
  },
  {
    id: "inhouse",
    label: "In-house",
    title: "Back-bar stock tracked",
    caption: "Internal usage products linked to services — cost visibility without billing the guest.",
  },
  {
    id: "chairs",
    label: "Chairs",
    title: "Stations on the floor",
    caption: "Know which chairs are free, busy, or assigned — queue and appointments stay aligned.",
  },
  {
    id: "staff",
    label: "Staff",
    title: "Who is on the floor",
    caption: "Profiles, roles, and booking visibility so owners know capacity before the rush.",
  },
  {
    id: "attendance",
    label: "Attendance",
    title: "Who checked in",
    caption: "Fingerprint kiosk and manual attendance — know who arrived before the day starts.",
  },
  {
    id: "devices",
    label: "Devices",
    title: "Hardware that runs the floor",
    caption:
      "Connect attendance kiosks, invoice / receipt printers, and electronic cash drawers. Native mobile and desktop apps are coming soon — web is available today.",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    title: "Follow-ups without leaving Beautora",
    caption: "Message guests after visits using templates tied to your store — not a separate inbox.",
  },
  {
    id: "feedback",
    label: "Feedback",
    title: "Ratings that come back",
    caption: "Collect guest feedback and spot service issues before they become reviews elsewhere.",
  },
  {
    id: "reports",
    label: "Reports",
    title: "Numbers you can trust",
    caption: "Sales, deposits, and usage visibility for owners and managers.",
  },
  {
    id: "finances",
    label: "Finances",
    title: "Money movement clear",
    caption: "See how cash, JazzCash, and other payments land — without rebuilding spreadsheets.",
  },
  {
    id: "billing",
    label: "Billing",
    title: "Store subscription in one place",
    caption: "Trial status, renewals, and invoice uploads — keep the salon unlocked without drama.",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SIDEBAR_BY_TAB: Partial<Record<TabId, string>> = {
  overview: "Home",
  booking: "Book",
  appointments: "Appts",
  queue: "Queue",
  pos: "POS",
  sales: "Sales",
  customers: "Clients",
  services: "Svc",
  products: "Prod",
  inhouse: "Stock",
  chairs: "Chair",
  staff: "Staff",
  attendance: "Attend",
  devices: "Device",
  whatsapp: "WA",
  feedback: "Rate",
  reports: "Report",
  finances: "Money",
  billing: "Bill",
};

export function ProductShowcaseSection() {
  const [active, setActive] = useState<TabId>("overview");
  const current = TABS.find((t) => t.id === active) ?? TABS[0];
  const tabListRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = tabListRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max - el.scrollLeft > 4);
  }, []);

  useEffect(() => {
    const el = tabListRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  useEffect(() => {
    const el = tabListRef.current;
    if (!el) return;
    const activeBtn = el.querySelector<HTMLElement>(`#product-tab-${active}`);
    activeBtn?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
    // Re-check after scroll settles
    const t = window.setTimeout(updateScrollState, 320);
    return () => window.clearTimeout(t);
  }, [active, updateScrollState]);

  function scrollTabs(direction: "left" | "right") {
    const el = tabListRef.current;
    if (!el) return;
    const amount = Math.min(280, Math.round(el.clientWidth * 0.65));
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section id="product" className="scroll-mt-28 bg-[var(--m-mist)] py-28 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--m-accent)]">
              Product
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-5xl">
              Everything your salon needs.
              <span className="block">One login.</span>
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[var(--m-muted)]">
              From the first booking to the final payment, Beautora keeps your team, customers, and
              numbers connected. Browse every area below.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll features left"
              className={cn(
                "inline-flex size-10 items-center justify-center border border-[var(--m-line)] bg-white text-[var(--m-ink)] transition-all duration-150",
                canScrollLeft
                  ? "hover:border-[var(--m-ink)] hover:bg-[var(--m-ink)] hover:text-white"
                  : "cursor-not-allowed opacity-35"
              )}
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => scrollTabs("right")}
              disabled={!canScrollRight}
              aria-label="Scroll features right"
              className={cn(
                "inline-flex size-10 items-center justify-center border border-[var(--m-line)] bg-white text-[var(--m-ink)] transition-all duration-150",
                canScrollRight
                  ? "hover:border-[var(--m-ink)] hover:bg-[var(--m-ink)] hover:text-white"
                  : "cursor-not-allowed opacity-35"
              )}
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div
          ref={tabListRef}
          className="mt-8 flex gap-0.5 overflow-x-auto border-b border-[var(--m-line)] pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="All Beautora features"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              id={`product-tab-${tab.id}`}
              aria-controls={`product-panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "shrink-0 border-b-2 px-2.5 py-3 text-[13px] font-medium transition-colors duration-150 sm:px-3",
                active === tab.id
                  ? "border-[var(--m-ink)] text-[var(--m-ink)]"
                  : "border-transparent text-[var(--m-muted)] hover:text-[var(--m-ink-soft)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          role="tabpanel"
          id={`product-panel-${current.id}`}
          aria-labelledby={`product-tab-${current.id}`}
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--m-accent)]">
              {current.label}
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl">
              {current.title}
            </h3>
            <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--m-muted)]">
              {current.caption}
            </p>
            {current.id === "devices" ? (
              <p className="mt-4 text-sm text-[var(--m-ink-soft)]">
                See{" "}
                <Link href="/apps" className="font-semibold underline-offset-4 hover:underline">
                  Mobile &amp; Desktop apps
                </Link>{" "}
                — coming soon.
              </p>
            ) : null}
          </div>

          <div className="border border-[var(--m-line)] bg-[var(--m-paper)] p-3 shadow-[0_20px_50px_-32px_rgba(6,33,29,0.45)] sm:p-4">
            <ProductFrame tab={current.id} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductFrame({ tab }: { tab: TabId }) {
  const activeNav = SIDEBAR_BY_TAB[tab] ?? "Home";
  const navItems = [
    "Home",
    "Appts",
    "Queue",
    "POS",
    "Clients",
    "Staff",
    "Device",
    "Report",
  ];

  return (
    <div className="overflow-hidden border border-[var(--m-line)] bg-white">
      <div className="flex items-center gap-2 border-b border-[var(--m-line)] bg-[var(--m-mist)]/80 px-3 py-2">
        <span className="size-2 rounded-full bg-[var(--m-ink)]/20" />
        <span className="size-2 rounded-full bg-[var(--m-ink)]/20" />
        <span className="size-2 rounded-full bg-[var(--m-ink)]/20" />
        <span className="ml-2 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--m-muted)]">
          Beautora · {tab.replace(/-/g, " ")}
        </span>
      </div>
      <div className="grid min-h-[300px] grid-cols-[4.25rem_1fr] sm:min-h-[340px] sm:grid-cols-[5.25rem_1fr]">
        <nav
          className="border-r border-[var(--m-line)] bg-[var(--m-ink)] px-1.5 py-3 text-[9px] text-white/50 sm:px-2 sm:text-[10px]"
          aria-hidden
        >
          {navItems.map((item) => (
            <div
              key={item}
              className={cn(
                "mb-0.5 truncate px-1.5 py-1.5 sm:px-2",
                item === activeNav ? "bg-white/10 text-white" : ""
              )}
            >
              {item}
            </div>
          ))}
        </nav>
        <div className="p-4 sm:p-5">
          <TabMock tab={tab} />
        </div>
      </div>
    </div>
  );
}

function Row({
  left,
  mid,
  right,
}: {
  left: string;
  mid: string;
  right: string;
}) {
  return (
    <div className="flex items-center gap-2 border border-[var(--m-line)] px-3 py-2.5 text-xs">
      <span className="w-[4.5rem] shrink-0 tabular-nums text-[var(--m-muted)] sm:w-16">
        {left}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-[var(--m-ink)]">{mid}</span>
      <span className="shrink-0 text-[var(--m-accent)]">{right}</span>
    </div>
  );
}

function StatGrid({
  items,
}: {
  items: { label: string; value: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border border-[var(--m-line)] p-3">
          <p className="text-[9px] uppercase tracking-wider text-[var(--m-muted)]">{item.label}</p>
          <p className="mt-1 font-display text-lg font-semibold text-[var(--m-ink)]">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function TabMock({ tab }: { tab: TabId }) {
  switch (tab) {
    case "overview":
      return (
        <div className="space-y-4">
          <StatGrid
            items={[
              { label: "Today", value: "12" },
              { label: "Sales", value: "Rs 48k" },
              { label: "Queue", value: "4" },
            ]}
          />
          <div className="border border-[var(--m-line)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
              Next up
            </p>
            <div className="mt-2 space-y-2 text-xs text-[var(--m-ink-soft)]">
              <p>10:00 · Sara · Haircut</p>
              <p>10:30 · Walk-in · Manicure</p>
              <p>11:00 · Ayesha · Facial</p>
            </div>
          </div>
        </div>
      );
    case "booking":
      return (
        <div className="space-y-3">
          <div className="border border-[var(--m-line)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
              Public page
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-[var(--m-ink)]">
              Book at your salon
            </p>
            <p className="mt-1 text-xs text-[var(--m-muted)]">Service · Stylist · Time</p>
          </div>
          <Row left="Haircut" mid="45 min" right="Rs 1,500" />
          <Row left="Facial" mid="60 min" right="Rs 2,500" />
          <Row left="Color" mid="120 min" right="Rs 4,500" />
        </div>
      );
    case "appointments":
      return (
        <div className="space-y-2">
          <Row left="10:00" mid="Sara · Haircut" right="Confirmed" />
          <Row left="11:00" mid="Ayesha · Facial" right="Confirmed" />
          <Row left="12:30" mid="Hina · Color" right="Waiting" />
          <Row left="14:00" mid="Open slot" right="Available" />
        </div>
      );
    case "queue":
      return (
        <div className="space-y-2">
          <Row left="#104" mid="Walk-in · Manicure" right="Serving" />
          <Row left="#105" mid="Walk-in · Haircut" right="Waiting" />
          <Row left="#106" mid="Walk-in · Beard" right="Waiting" />
          <p className="pt-2 text-[11px] text-[var(--m-muted)]">Chair 2 free · Chair 1 busy</p>
        </div>
      );
    case "pos":
      return (
        <div className="grid gap-3 sm:grid-cols-[1fr_0.9fr]">
          <div className="space-y-2">
            {["Haircut · Rs 1,500", "Serum · Rs 2,200", "Tips · Rs 200"].map((line) => (
              <div
                key={line}
                className="border border-[var(--m-line)] px-3 py-2 text-xs text-[var(--m-ink)]"
              >
                {line}
              </div>
            ))}
          </div>
          <div className="border border-[var(--m-ink)] bg-[var(--m-ink)] p-4 text-white">
            <p className="text-[10px] uppercase tracking-wider text-white/55">Total</p>
            <p className="mt-1 font-display text-2xl font-semibold">Rs 3,900</p>
            <p className="mt-4 border border-white/20 px-3 py-2 text-center text-xs">
              Complete sale
            </p>
          </div>
        </div>
      );
    case "marketplace":
      return (
        <div className="space-y-3">
          <div className="border border-[var(--m-line)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
              Marketplace shop
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-[var(--m-ink)]">
              Sell products online
            </p>
            <p className="mt-1 text-xs text-[var(--m-muted)]">COD · Separate from salon POS</p>
          </div>
          <Row left="Hair serum" mid="In stock" right="Rs 2,200" />
          <Row left="Shampoo kit" mid="In stock" right="Rs 3,500" />
          <Row left="Order #1042" mid="COD pending" right="New" />
        </div>
      );
    case "sales":
      return (
        <div className="space-y-2">
          <Row left="INV-882" mid="Sara · Cash" right="Paid" />
          <Row left="INV-881" mid="Ayesha · JazzCash" right="Paid" />
          <Row left="INV-880" mid="Walk-in · Card" right="Partial" />
        </div>
      );
    case "customers":
      return (
        <div className="space-y-2">
          <div className="border border-[var(--m-line)] px-3 py-2 text-xs text-[var(--m-muted)]">
            Search customers…
          </div>
          <Row left="VIP" mid="Sara Ahmed" right="12 visits" />
          <Row left="Return" mid="Ayesha Raza" right="4 visits" />
          <Row left="New" mid="Hina Malik" right="1 visit" />
        </div>
      );
    case "services":
      return (
        <div className="space-y-2">
          <Row left="45m" mid="Signature Haircut" right="Rs 1,500" />
          <Row left="60m" mid="Classic Facial" right="Rs 2,500" />
          <Row left="120m" mid="Full Color" right="Rs 4,500" />
        </div>
      );
    case "products":
      return (
        <div className="space-y-2">
          <Row left="Stock 24" mid="Repair Serum" right="Rs 2,200" />
          <Row left="Stock 8" mid="Shampoo 250ml" right="Rs 1,100" />
          <Row left="Low 2" mid="Clay Mask" right="Rs 1,800" />
        </div>
      );
    case "inhouse":
      return (
        <div className="space-y-2">
          <Row left="Color" mid="Developer 20vol" right="In use" />
          <Row left="Treat" mid="Keratin pack" right="Linked" />
          <Row left="Cost" mid="Usage on haircut" right="Internal" />
        </div>
      );
    case "chairs":
      return (
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Chair 1", "Busy"],
            ["Chair 2", "Free"],
            ["Chair 3", "Busy"],
            ["Chair 4", "Free"],
          ].map(([name, status]) => (
            <div key={name} className="border border-[var(--m-line)] p-3 text-xs">
              <p className="font-medium text-[var(--m-ink)]">{name}</p>
              <p
                className={
                  status === "Free" ? "mt-1 text-[var(--m-accent)]" : "mt-1 text-amber-800"
                }
              >
                {status}
              </p>
            </div>
          ))}
        </div>
      );
    case "staff":
      return (
        <div className="space-y-2">
          <Row left="Stylist" mid="Amna" right="On floor" />
          <Row left="Color" mid="Bilal" right="Break" />
          <Row left="Front" mid="Sana" right="On floor" />
        </div>
      );
    case "attendance":
      return (
        <div className="space-y-2">
          <Row left="09:02" mid="Amna · Check-in" right="OK" />
          <Row left="09:08" mid="Bilal · Check-in" right="OK" />
          <Row left="—" mid="Sana · Pending" right="Late" />
        </div>
      );
    case "devices":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="border border-[var(--m-line)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                Attendance terminal
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--m-ink)]">
                Fingerprint kiosk · Online
              </p>
              <p className="mt-1 text-xs text-[var(--m-muted)]">Staff check-in on the floor</p>
            </div>
            <div className="border border-[var(--m-line)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                Invoice printer
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--m-ink)]">
                Thermal receipt printer · Ready
              </p>
              <p className="mt-1 text-xs text-[var(--m-muted)]">
                Prints invoices &amp; sale receipts from POS
              </p>
            </div>
            <div className="border border-[var(--m-line)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
                Electronic cash drawer
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--m-ink)]">
                Till drawer · Linked
              </p>
              <p className="mt-1 text-xs text-[var(--m-muted)]">
                Opens from POS / queue when cash is taken
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="border border-[var(--m-line)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-muted)]">
                Mobile
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--m-ink)]">iOS &amp; Android</p>
              <p className="mt-1 text-[11px] text-[var(--m-accent)]">Coming soon</p>
            </div>
            <div className="border border-[var(--m-line)] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-muted)]">
                Desktop
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--m-ink)]">Windows &amp; macOS</p>
              <p className="mt-1 text-[11px] text-[var(--m-accent)]">Coming soon</p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--m-muted)]">Web app · Available today</p>
        </div>
      );
    case "whatsapp":
      return (
        <div className="space-y-2">
          <Row left="Template" mid="Thanks for visiting" right="Ready" />
          <Row left="Sent" mid="Sara · Follow-up" right="Delivered" />
          <Row left="Draft" mid="Reminder · tomorrow" right="Edit" />
        </div>
      );
    case "feedback":
      return (
        <div className="space-y-2">
          <Row left="★★★★★" mid="Sara · Haircut" right="New" />
          <Row left="★★★★☆" mid="Ayesha · Facial" right="New" />
          <Row left="★★★★★" mid="Hina · Color" right="Seen" />
        </div>
      );
    case "reports":
      return (
        <div className="space-y-4">
          <div className="flex h-24 items-end gap-1.5 border border-[var(--m-line)] px-3 pb-3 pt-4">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-[var(--m-accent)]/35"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <StatGrid
            items={[
              { label: "This week", value: "Rs 186k" },
              { label: "Services", value: "142" },
            ]}
          />
        </div>
      );
    case "finances":
      return (
        <div className="space-y-2">
          <StatGrid
            items={[
              { label: "Cash", value: "Rs 62k" },
              { label: "JazzCash", value: "Rs 41k" },
              { label: "Due", value: "Rs 8k" },
            ]}
          />
          <Row left="Today" mid="Net collected" right="Rs 95k" />
        </div>
      );
    case "billing":
      return (
        <div className="space-y-3">
          <div className="border border-[var(--m-line)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-accent)]">
              Subscription
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-[var(--m-ink)]">
              Trial · 18 days left
            </p>
            <p className="mt-1 text-xs text-[var(--m-muted)]">
              Then Rs 3,000 / month per store
            </p>
          </div>
          <Row left="Invoice" mid="Upload JazzCash proof" right="Pending" />
        </div>
      );
    default:
      return null;
  }
}
