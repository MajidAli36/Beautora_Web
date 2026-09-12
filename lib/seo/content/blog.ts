export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  tags: string[];
  body: string[];
  related: { label: string; href: string }[];
};

/** Seed articles only — expand with genuinely useful content, never mass AI spam. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-reduce-salon-no-shows",
    title: "How to Reduce Salon No-Shows",
    description:
      "Practical ways salons reduce no-shows: clearer booking, optional advances, reminders, and schedule discipline — with Beautora workflows.",
    publishedAt: "2026-09-01",
    updatedAt: "2026-09-12",
    author: "Beautora Team",
    tags: ["operations", "booking"],
    body: [
      "No-shows are not only rude — they are empty chairs, unused product, and wasted wage time. The fix is rarely a single reminder text. It is a system: clear booking rules, optional advances when appropriate, and a floor that can fill gaps with walk-ins.",
      "Start with honest availability. If online booking offers times that staff cannot honor, guests learn that your book is unreliable. Tie booking to real stylist schedules and service durations.",
      "Then decide your advance policy. Not every market or service needs a deposit, but high-demand slots often do. Beautora supports optional advances with payment proof so the desk can approve before the visit.",
      "Finally, measure. Track completed vs cancelled vs no-show appointments by stylist and daypart. Patterns beat anecdotes when you coach the team.",
    ],
    related: [
      { label: "Salon booking software", href: "/salon-booking-software" },
      { label: "No-show calculator", href: "/tools/salon-no-show-calculator" },
      { label: "Salon management", href: "/salon-management-software" },
    ],
  },
  {
    slug: "salon-pos-checklist-for-busy-saturdays",
    title: "Salon POS Checklist for Busy Saturdays",
    description:
      "A practical POS checklist for peak salon days: tickets, retail, staff credit, and end-of-day hygiene.",
    publishedAt: "2026-09-05",
    updatedAt: "2026-09-12",
    author: "Beautora Team",
    tags: ["pos", "operations"],
    body: [
      "Saturday rush exposes weak checkout. If tickets are incomplete, retail is forgotten, or staff credit is missing, Monday arguments are guaranteed.",
      "Before doors open: confirm POS login access for desk roles, printer/drawer readiness if you use devices, and that services/products are priced correctly.",
      "During service: attach the right appointment or walk-in context, add retail while the guest is still engaged, and credit the stylists who delivered the work.",
      "After close: review voids/refunds, check dues, and glance at top services. Beautora’s sales history is built for this rhythm — use it the same day, not next week.",
    ],
    related: [
      { label: "Salon POS", href: "/salon-pos" },
      { label: "Salon inventory", href: "/salon-inventory-management" },
      { label: "Features", href: "/features" },
    ],
  },
];

export function getBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getAllBlogSlugs() {
  return BLOG_POSTS.map((p) => p.slug);
}
