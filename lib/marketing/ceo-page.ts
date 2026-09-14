import { SYNCOPS } from "@/lib/print/syncops";
import { BEAUTORA_PRODUCT_PAIR } from "@/lib/marketing/products";

/** Content for /ceo — Majid Ali founder page. */
export const CEO_PAGE = {
  path: "/ceo",
  company: SYNCOPS.builder.name,
  domain: SYNCOPS.builder.domain,
  url: SYNCOPS.builder.url,
  email: SYNCOPS.email,
  phone: SYNCOPS.phone,
  phoneDisplay: SYNCOPS.phoneDisplay,
  ceo: {
    name: SYNCOPS.ceo.name,
    role: "Founder & Chief Executive Officer",
    photo: SYNCOPS.ceo.photo,
    portraitAlt: `${SYNCOPS.ceo.name}, Founder & CEO of ${SYNCOPS.builder.name} and ${SYNCOPS.name}`,
    messageTitle: "Message from the CEO",
    headline: "Salon Management, POS & Marketplace — built to last.",
    message:
      "We don't just ship features—we build partnerships that drive lasting success. Beautora gives beauty businesses Salon Management with a real POS floor, plus a Marketplace to sell products online — with quality, discipline, and trust at the center of every engagement.",
    focus:
      "From the first booking and POS ticket to Marketplace COD orders, SyncOps ships products operators can trust — calm UX, reliable systems, and support that feels like a real partnership.",
    principles: [
      {
        title: "Operators first",
        body: "Every feature must earn its place on a busy salon floor — POS, queue, and booking included — not just in a demo deck.",
      },
      {
        title: "Two products, clear books",
        body: `${BEAUTORA_PRODUCT_PAIR.title}: salon ops stay separate from Marketplace sales so money and stock never mix by accident.`,
      },
      {
        title: "Global, grounded",
        body: "Designed in Pakistan for beauty businesses worldwide — local payment reality, world-class finish.",
      },
    ],
    links: SYNCOPS.ceo.links,
  },
  productCredit: SYNCOPS.builder.short,
  syncOpsPath: "/syncops",
  syncOpsUrl: SYNCOPS.builder.url,
  syncOpsDomain: SYNCOPS.builder.domain,
} as const;
