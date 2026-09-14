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
      "Beautora Salon Management, POS & Marketplace for US beauty businesses — online booking, salon POS, CRM, staff, reporting, and product marketplace nationwide.",
    h1: "Salon Management Software in the USA",
    lead: "US salons need reliable online booking, clean checkout, team visibility, and a path to sell products online. Beautora delivers Salon Management, POS & Marketplace for independent shops and growing studios.",
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
      "Beautora Salon Management, POS & Marketplace for UK salons — booking, POS, staff, client history, and online product selling for British beauty businesses.",
    h1: "Salon Management Software in the UK",
    lead: "From high-street salons to multi-stylist studios, Beautora helps UK teams run booking, floor POS, and Marketplace product sales in one workspace.",
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
      "Beautora Salon Management, POS & Marketplace for UAE beauty businesses — online booking, POS, staff, operations, and Marketplace retail for Dubai and beyond.",
    h1: "Salon Management Software in the UAE",
    lead: "UAE salons move fast and serve international clients. Beautora supports online booking, salon POS, team coordination, and Marketplace retail.",
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
      "Beautora Salon Management, POS & Marketplace for Pakistan — JazzCash-friendly billing, online booking, salon POS, staff, public directory, and Marketplace COD shop.",
    h1: "Salon Management Software in Pakistan",
    lead: "Beautora started with strong Pakistan operations in mind — JazzCash subscription flows, Pakistan timezone booking, a public directory, and Marketplace COD — while remaining a global Salon Management, POS & Marketplace product.",
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
