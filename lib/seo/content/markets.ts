import type { SeoMarketSlug } from "@/lib/seo/constants";

export type MarketPageContent = {
  slug: SeoMarketSlug;
  title: string;
  description: string;
  h1: string;
  lead: string;
  localNotes: string[];
  faqs: { question: string; answer: string }[];
};

/**
 * Only markets with unique localized copy are published.
 * Do not mass-generate near-identical country pages.
 */
export const PUBLISHED_MARKET_PAGES: MarketPageContent[] = [
  {
    slug: "usa",
    title: "Salon Management Software in the USA",
    description:
      "Beautora salon management software for US beauty businesses — online booking, POS, CRM, staff, and reporting for salons nationwide.",
    h1: "Salon Management Software in the USA",
    lead: "US salons need reliable online booking, clean checkout, and team visibility. Beautora delivers a modern web platform for independent shops and growing studios.",
    localNotes: [
      "Operate in English with a web-first workflow that fits US salon desks.",
      "Use store country settings for display currency appropriate to your business.",
      "Public booking pages help guests schedule without phone tag across time zones.",
    ],
    faqs: [
      {
        question: "Is Beautora available to US salons?",
        answer:
          "Yes. Beautora is a web platform for beauty businesses internationally, including the United States.",
      },
    ],
  },
  {
    slug: "uk",
    title: "Salon Management Software in the UK",
    description:
      "Beautora salon management software for UK salons — booking, POS, staff, and client history for British beauty businesses.",
    h1: "Salon Management Software in the UK",
    lead: "From high-street salons to multi-stylist studios, Beautora helps UK teams run booking, floor ops, and checkout in one place.",
    localNotes: [
      "Web-based POS and booking suit UK salon counters without a heavyweight install.",
      "Staff schedules keep online booking aligned to who is actually working.",
      "Client history supports repeat custom common in UK salon culture.",
    ],
    faqs: [
      {
        question: "Do UK salons need a separate app?",
        answer: "Guests and staff use the browser. Native apps are on the roadmap; web is live today.",
      },
    ],
  },
  {
    slug: "uae",
    title: "Salon Management Software in the UAE",
    description:
      "Beautora salon management software for UAE beauty businesses — online booking, POS, staff, and operations for Dubai and beyond.",
    h1: "Salon Management Software in the UAE",
    lead: "UAE salons move fast and serve international clients. Beautora supports online booking, clear checkout, and team coordination.",
    localNotes: [
      "English-first interface suitable for diverse salon teams.",
      "Public booking reduces WhatsApp-only scheduling pressure.",
      "Store settings support regional currency display.",
    ],
    faqs: [
      {
        question: "Can salons in Dubai use Beautora?",
        answer: "Yes. Beautora is built for international beauty businesses, including the UAE.",
      },
    ],
  },
  {
    slug: "pakistan",
    title: "Salon Management Software in Pakistan",
    description:
      "Beautora salon management software for Pakistan — JazzCash-friendly billing options, online booking, POS, staff, and a public salon directory.",
    h1: "Salon Management Software in Pakistan",
    lead: "Beautora started with strong Pakistan operations in mind — JazzCash subscription flows, Pakistan timezone booking, and a public directory — while remaining a global product.",
    localNotes: [
      "Trial and subscription flows support JazzCash where configured.",
      "Booking times follow Pakistan Standard Time for local stores.",
      "Guests can discover salons via the Beautora stores directory.",
    ],
    faqs: [
      {
        question: "Is Beautora only for Pakistan?",
        answer:
          "No. Pakistan is an important market with local payment options, but Beautora serves beauty businesses worldwide.",
      },
    ],
  },
];

export function getPublishedMarket(slug: string) {
  return PUBLISHED_MARKET_PAGES.find((m) => m.slug === slug);
}

export function getPublishedMarketSlugs() {
  return PUBLISHED_MARKET_PAGES.map((m) => m.slug);
}
