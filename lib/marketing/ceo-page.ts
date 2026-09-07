import { SYNCOPS } from "@/lib/print/syncops";

/** Content for /ceo — Majid Ali founder page. */
export const CEO_PAGE = {
  path: "/ceo",
  company: SYNCOPS.name,
  domain: SYNCOPS.domain,
  url: SYNCOPS.url,
  email: SYNCOPS.email,
  phone: SYNCOPS.phone,
  phoneDisplay: SYNCOPS.phoneDisplay,
  ceo: {
    name: SYNCOPS.ceo.name,
    role: "Founder & Chief Executive Officer",
    photo: SYNCOPS.ceo.photo,
    portraitAlt: `${SYNCOPS.ceo.name}, Founder & CEO of ${SYNCOPS.builder.name} and ${SYNCOPS.name}`,
    messageTitle: "Message from the CEO",
    headline: "Partnerships that outlast releases.",
    message:
      "We don't just build software—we build partnerships that drive lasting success. Beautora creates long-term products and systems for beauty businesses worldwide, with quality, discipline, and trust at the center of every engagement.",
    focus:
      "From the first booking link to multi-store operations, SyncOps ships products operators can trust on the floor — calm UX, reliable systems, and support that feels like a real partnership.",
    principles: [
      {
        title: "Operators first",
        body: "Every feature must earn its place on a busy salon floor — not in a demo deck.",
      },
      {
        title: "Long-term craft",
        body: "We build products meant to last years: disciplined UX, clear ops, and honest pricing.",
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
