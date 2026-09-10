import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  MessageSquareHeart,
  Package,
  Scissors,
  ShoppingCart,
  Users,
} from "lucide-react";

export type GuideStep = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  href: string;
  cta: string;
  icon: LucideIcon;
};

/**
 * Recommended setup → daily use path for a new salon.
 * Keep 5–8 steps; this is the full recommended tour.
 */
export const GUIDE_STEPS: GuideStep[] = [
  {
    id: "services",
    title: "1. Add your services",
    summary: "Build the menu your salon sells.",
    detail:
      "Start in Catalog → Services. Add haircuts, coloring, facials, and anything you charge for — with price and duration. POS and appointments use this list.",
    href: "/services",
    cta: "Open Services",
    icon: Scissors,
  },
  {
    id: "products",
    title: "2. Add products (if you sell them)",
    summary: "Retail and in-house stock in one place.",
    detail:
      "If you sell shampoo, kits, or other goods, add them under Catalog → Products. Skip this if you only sell services for now — you can add products later.",
    href: "/products",
    cta: "Open Products",
    icon: Package,
  },
  {
    id: "customers",
    title: "3. Save your customers",
    summary: "Keep client details ready for bookings and bills.",
    detail:
      "Add walk-ins and regulars under Customers. Phone and name are enough to start. Appointments and POS can also create a customer when you book or bill.",
    href: "/customers",
    cta: "Open Customers",
    icon: Users,
  },
  {
    id: "queue",
    title: "4. Run the walk-in queue",
    summary: "Issue tokens when guests arrive without a booking.",
    detail:
      "Use Queue for same-day walk-ins: pick a customer, staff or chair if needed, and issue a token. Great for busy floor flow alongside appointments.",
    href: "/queue",
    cta: "Open Queue",
    icon: ClipboardList,
  },
  {
    id: "pos",
    title: "5. Checkout at POS",
    summary: "Turn services and products into invoices.",
    detail:
      "Open POS, select an appointment (or a walk-in customer), add items, then complete the sale. A billed appointment leaves the open POS list automatically.",
    href: "/pos",
    cta: "Open POS",
    icon: ShoppingCart,
  },
  {
    id: "whatsapp-feedback",
    title: "6. WhatsApp & feedback",
    summary: "Stay in touch and collect reviews.",
    detail:
      "Under Communication, set up WhatsApp messages and Feedback so guests can share how their visit went. Use this after the service to build trust and return visits.",
    href: "/whatsapp",
    cta: "Open WhatsApp",
    icon: MessageSquareHeart,
  },
  {
    id: "appointments",
    title: "7. Appointments & online booking",
    summary: "In-house bookings, online requests, and history.",
    detail:
      "Use Appointments for reception bookings and online requests in one place — In-house, Online, Incoming advances, and History. Mark no-shows or open POS to bill.",
    href: "/appointments",
    cta: "Open Appointments",
    icon: CalendarDays,
  },
  {
    id: "reports",
    title: "8. Check Reports",
    summary: "See how the salon is performing.",
    detail:
      "Reports show revenue, services, staff, inventory, and dues. Pick a date range and switch tabs to understand sales and where to improve.",
    href: "/reports",
    cta: "Open Reports",
    icon: BarChart3,
  },
];
