import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CalendarCheck,
  Clapperboard,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Monitor,
  Package,
  Droplets,
  Receipt,
  Scissors,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Armchair,
  Star,
  Store,
  Ticket,
  UserCog,
  Users,
  Wallet,
  Boxes,
  ClipboardList,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  key: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, key: "dashboard" }],
  },
  {
    label: "Operations",
    items: [
      { title: "Customers", href: "/customers", icon: Users, key: "customers" },
      { title: "Appointments", href: "/appointments", icon: Calendar, key: "appointments" },
      { title: "Online booking", href: "/appointments?tab=online", icon: Globe, key: "online_booking" },
      { title: "Queue", href: "/queue", icon: Ticket, key: "queue" },
      { title: "POS", href: "/pos", icon: ShoppingCart, key: "pos" },
      { title: "Sales", href: "/sales", icon: Receipt, key: "sales" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { title: "Services", href: "/services", icon: Scissors, key: "services" },
      { title: "Products", href: "/products", icon: Package, key: "products" },
      { title: "In-house", href: "/in-house", icon: Droplets, key: "products" },
      { title: "Chairs", href: "/chairs", icon: Armchair, key: "chairs" },
    ],
  },
  {
    label: "Team",
    items: [
      { title: "Staff", href: "/staff", icon: UserCog, key: "staff" },
      { title: "Attendance", href: "/attendance", icon: CalendarCheck, key: "attendance" },
      { title: "Devices", href: "/devices", icon: Monitor, key: "devices" },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", href: "/reports", icon: BarChart3, key: "reports" },
      { title: "Finances", href: "/finances", icon: Wallet, key: "finances" },
    ],
  },
  {
    label: "Communication",
    items: [
      { title: "WhatsApp", href: "/whatsapp", icon: MessageSquare, key: "whatsapp" },
      { title: "Feedback", href: "/feedback", icon: Star, key: "feedback" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Billing", href: "/billing", icon: Wallet, key: "billing" },
      { title: "Settings", href: "/settings", icon: Settings, key: "settings" },
    ],
  },
];

/** Seller-side marketplace nav — separate from salon management. */
export const marketplaceNavGroups: NavGroup[] = [
  {
    label: "Marketplace",
    items: [
      { title: "Dashboard", href: "/marketplace", icon: LayoutDashboard, key: "mp_dashboard" },
      { title: "Onboarding", href: "/marketplace/onboarding", icon: Store, key: "mp_onboarding" },
      { title: "Products", href: "/marketplace/products", icon: Package, key: "mp_products" },
      { title: "Inventory", href: "/marketplace/inventory", icon: Boxes, key: "mp_inventory" },
      { title: "Orders", href: "/marketplace/orders", icon: ClipboardList, key: "mp_orders" },
      { title: "Payouts", href: "/marketplace/payouts", icon: Wallet, key: "mp_payouts" },
      { title: "Analytics", href: "/marketplace/analytics", icon: BarChart3, key: "mp_analytics" },
      { title: "Reviews", href: "/marketplace/reviews", icon: Star, key: "mp_reviews" },
      { title: "Account settings", href: "/marketplace/settings", icon: Settings, key: "mp_settings" },
    ],
  },
  {
    label: "Storefront",
    items: [
      { title: "Public shop", href: "/shop", icon: ShoppingBag, key: "mp_shop" },
      { title: "Discover", href: "/discover", icon: Globe, key: "mp_discover" },
      { title: "Videos / Reels", href: "/videos", icon: Clapperboard, key: "mp_videos" },
    ],
  },
];

export const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/billing": "Billing",
  "/platform": "Platform admin",
  "/platform/subscriptions": "Platform admin",
  "/customers": "Customers",
  "/appointments": "Appointments",
  "/appointments/new": "Add appointment",
  "/online-booking": "Appointments",
  "/queue": "Queue",
  "/pos": "Point of Sale",
  "/sales": "Sales",
  "/services": "Services",
  "/products": "Products",
  "/in-house": "In-house stock",
  "/chairs": "Chairs",
  "/staff": "Staff",
  "/attendance": "Attendance",
  "/devices": "Devices",
  "/reports": "Reports",
  "/finances": "Finances",
  "/whatsapp": "WhatsApp",
  "/feedback": "Feedback",
  "/settings": "Settings",
  "/marketplace": "Marketplace",
  "/marketplace/onboarding": "Marketplace onboarding",
  "/marketplace/products": "Marketplace products",
  "/marketplace/inventory": "Marketplace inventory",
  "/marketplace/orders": "Marketplace orders",
  "/marketplace/payouts": "Marketplace payouts",
  "/marketplace/analytics": "Marketplace analytics",
  "/marketplace/reviews": "Marketplace reviews",
  "/marketplace/settings": "Account settings",
  "/platform/marketplace": "Marketplace admin",
  "/shop": "Marketplace Shop",
  "/discover": "Discover",
  "/cart": "Cart",
  "/checkout": "Checkout",
};

export function getPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/in-house/")) return "In-house product";
  if (pathname.startsWith("/marketplace")) return "Marketplace";
  const base = pathname.split("/").slice(0, 2).join("/");
  if (pageTitles[base]) return pageTitles[base];
  return "Hair & Care Salon";
}
