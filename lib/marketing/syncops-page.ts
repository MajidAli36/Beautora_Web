import { SYNCOPS } from "@/lib/print/syncops";

/** Content for /syncops — SyncOps product house page. */
export const SYNCOPS_PAGE = {
  path: "/syncops",
  company: SYNCOPS.builder.name,
  product: SYNCOPS.name,
  domain: SYNCOPS.builder.domain,
  url: SYNCOPS.builder.url,
  email: SYNCOPS.email,
  phone: SYNCOPS.phone,
  phoneDisplay: SYNCOPS.phoneDisplay,
  eyebrow: "Product studio",
  headline: "SyncOps builds software that runs real businesses.",
  lead:
    "We design and ship operating systems for service brands — starting with Beautora, the salon platform for bookings, POS, staff, and growth.",
  points: [
    {
      title: "Beautora",
      body: "Salon OS for modern stores — online booking, POS, queue, WhatsApp, attendance, and reports.",
      href: "/",
    },
    {
      title: "Craft & discipline",
      body: "Long-term products with clean UX, reliable ops, and support that feels like a partnership.",
    },
    {
      title: "Built to scale",
      body: "One store today, a multi-location brand tomorrow — without rewriting your stack.",
    },
  ],
  backlinks: [
    {
      label: "Official website",
      href: SYNCOPS.builder.url,
      external: true,
      hint: SYNCOPS.builder.domain,
    },
    {
      label: "Beautora product",
      href: "/",
      external: false,
      hint: SYNCOPS.domain,
    },
    {
      label: "Founder & CEO",
      href: "/ceo",
      external: false,
      hint: SYNCOPS.ceo.name,
    },
    {
      label: "LinkedIn",
      href: SYNCOPS.ceo.links.linkedin,
      external: true,
      hint: "Majid Ali",
    },
  ],
  ceoPath: "/ceo",
  productCredit: SYNCOPS.builder.short,
} as const;
