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
    nav: "Home",
  },
  {
    id: "booking",
    label: "Booking",
    title: "Clients book themselves",
    caption:
      "Public store page with services, stylists, and slots — optional advance payment when you need it.",
    nav: "Book",
  },
  {
    id: "appointments",
    label: "Floor",
    title: "Appointments and walk-ins",
    caption: "Confirmed visits, waiting guests, and queue tokens so the chair stays filled.",
    nav: "Appts",
  },
  {
    id: "pos",
    label: "POS",
    title: "Checkout that matches the floor",
    caption: "Services, retail, and staff attribution in a single sale — ready for end-of-day reports.",
    nav: "POS",
  },
  {
    id: "customers",
    label: "Customers",
    title: "History that travels with them",
    caption: "Profiles, visits, tags, and notes — not a scattered list of phone numbers.",
    nav: "Clients",
  },
  {
    id: "staff",
    label: "Staff",
    title: "Who is on the floor",
    caption: "Profiles, roles, and attendance so owners know capacity before the rush.",
    nav: "Staff",
  },
  {
    id: "reports",
    label: "Reports",
    title: "Numbers you can trust",
    caption: "Sales, deposits, and usage visibility for owners and managers.",
    nav: "Report",
  },
  {
    id: "marketplace",
    label: "Marketplace",
    title: "Sell products online",
    caption:
      "List products, take COD orders, and keep marketplace stock separate from salon POS finances.",
    nav: "Shop",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

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

  function onTabKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Home" && e.key !== "End") {
      return;
    }
    e.preventDefault();
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TABS.length - 1;
    const tab = TABS[next]!;
    setActive(tab.id);
    requestAnimationFrame(() => {
      document.getElementById(`product-tab-${tab.id}`)?.focus();
    });
  }

  return (
    <section id="product" className="m-section scroll-mt-28 bg-[var(--m-card)]">
      <div className="m-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="m-eyebrow">Product</p>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.5vw,2.75rem)] font-semibold tracking-tight text-[var(--m-ink)]">
              Everything your salon needs.
              <span className="block">One login.</span>
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--m-muted)]">
              From the first booking to the final payment, Beautora keeps your team, customers, and
              numbers connected.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-end">
            <button
              type="button"
              onClick={() => scrollTabs("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll features left"
              className={cn(
                "inline-flex size-10 items-center justify-center border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink)] transition-all duration-150",
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
                "inline-flex size-10 items-center justify-center border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink)] transition-all duration-150",
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
          className="mt-5 flex gap-1 overflow-x-auto border-b border-[var(--m-line)] pb-px sm:mt-6"
          role="tablist"
          aria-label="Beautora product areas"
        >
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active === tab.id}
              id={`product-tab-${tab.id}`}
              aria-controls={`product-panel-${tab.id}`}
              tabIndex={active === tab.id ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors duration-150 sm:px-4",
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
          className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:items-start lg:gap-8"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--m-ink-soft)]">
              {current.label}
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--m-ink)] sm:text-3xl">
              {current.title}
            </h3>
            <p className="mt-3 max-w-md text-base leading-relaxed text-[var(--m-muted)]">
              {current.caption}
            </p>
            <Link href="/features" className="m-btn m-btn-secondary mt-5">
              Explore all features
            </Link>
          </div>

          <div className="border border-[var(--m-line)] bg-[var(--m-mist)] p-3 shadow-[var(--m-shadow)] sm:p-4">
            <ProductFrame tab={current.id} activeNav={current.nav} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductFrame({ tab, activeNav }: { tab: TabId; activeNav: string }) {
  const navItems = ["Home", "Book", "Appts", "POS", "Clients", "Staff", "Report", "Shop"];

  return (
    <div className="overflow-hidden border border-[var(--m-line)] bg-[var(--m-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--m-line)] bg-[var(--m-mist)]/80 px-3 py-2">
        <span className="size-2 rounded-full bg-[var(--m-ink)]/20" />
        <span className="size-2 rounded-full bg-[var(--m-ink)]/20" />
        <span className="size-2 rounded-full bg-[var(--m-ink)]/20" />
        <span className="ml-2 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--m-muted)]">
          Beautora · {tab}
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
    <div className="grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-x-2 border border-[var(--m-line)] px-3 py-2.5 text-xs sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
      <span className="whitespace-nowrap tabular-nums text-[var(--m-muted)]">{left}</span>
      <span className="min-w-0 truncate font-medium text-[var(--m-ink)]">{mid}</span>
      <span className="justify-self-end whitespace-nowrap text-right text-[var(--m-ink-soft)]">
        {right}
      </span>
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border border-[var(--m-line)] p-3">
          <p className="text-[9px] uppercase tracking-wider text-[var(--m-muted)]">{item.label}</p>
          <p className="mt-1 font-display text-lg font-semibold text-[var(--m-ink)]">{item.value}</p>
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-ink-soft)]">
              Next up
            </p>
            <div className="mt-2 space-y-2 text-xs text-[var(--m-body)]">
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-ink-soft)]">
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
          <Row left="#104" mid="Walk-in · Manicure" right="Serving" />
          <Row left="#105" mid="Walk-in · Haircut" right="Waiting" />
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
    case "staff":
      return (
        <div className="space-y-2">
          <Row left="09:02" mid="Amna · Stylist" right="On floor" />
          <Row left="09:08" mid="Bilal · Colorist" right="Break" />
          <Row left="09:15" mid="Sana · Reception" right="On floor" />
        </div>
      );
    case "reports":
      return (
        <div className="space-y-4">
          <div className="flex h-24 items-end gap-1.5 border border-[var(--m-line)] px-3 pb-3 pt-4">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-[var(--m-ink-soft)]/30"
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
    case "marketplace":
      return (
        <div className="space-y-3">
          <div className="border border-[var(--m-line)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--m-ink-soft)]">
              Marketplace shop
            </p>
            <p className="mt-2 font-display text-xl font-semibold text-[var(--m-ink)]">
              Sell products online
            </p>
            <p className="mt-1 text-xs text-[var(--m-muted)]">
              COD · Separate from salon POS · Included with your store plan
            </p>
          </div>
          <Row left="Hair serum" mid="In stock" right="Rs 2,200" />
          <Row left="Shampoo kit" mid="In stock" right="Rs 3,500" />
          <Row left="Order #1042" mid="COD pending" right="New" />
        </div>
      );
    default:
      return null;
  }
}
