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
    portraitAlt: `${SYNCOPS.ceo.name}, Founder & CEO of ${SYNCOPS.name}`,
    messageTitle: "Message from the CEO",
    message:
      "We don't just build software—we build partnerships that drive lasting success. Beautora creates long-term products and systems for beauty businesses worldwide, with quality, discipline, and trust at the center of every engagement.",
  },
  productCredit: SYNCOPS.builder.short,
  syncOpsPath: "/syncops",
} as const;
