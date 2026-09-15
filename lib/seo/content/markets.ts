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
      "Beautora Salon Management, POS & Marketplace for US beauty businesses — online booking, salon POS, CRM, staff, reporting, and product marketplace. $15/month USDT after trial.",
    h1: "Salon Management Software in the USA",
    lead: "US salons need reliable online booking, clean checkout, team visibility, and a path to sell products online. Beautora delivers Salon Management, POS & Marketplace for independent shops and growing studios.",
    localNotes: [
      "Operate in English with a web-first workflow that fits US salon desks.",
      "US stores renew at $15/month via USDT (BEP-20) after the free trial.",
      "Public booking pages help guests schedule without phone tag across time zones.",
    ],
    faqs: [
      {
        question: "Is Beautora available to US salons?",
        answer:
          "Yes. Beautora is a web platform for beauty businesses internationally, including the United States.",
      },
      {
        question: "How much does Beautora cost in the USA?",
        answer:
          "US stores get a 30-day free trial, then $15/month via USDT on BNB Smart Chain (BEP-20).",
      },
      {
        question: "Does Beautora include a Marketplace?",
        answer:
          "Yes. US salons can run booking and POS plus sell products online through Beautora Marketplace.",
      },
    ],
  },
  {
    slug: "uk",
    title: "Salon Management Software in the UK",
    description:
      "Beautora Salon Management, POS & Marketplace for UK salons — booking, POS, staff, client history, and online product selling. $15/month USDT after trial.",
    h1: "Salon Management Software in the UK",
    lead: "From high-street salons to multi-stylist studios, Beautora helps UK teams run booking, floor POS, and Marketplace product sales in one workspace.",
    localNotes: [
      "Web-based POS and booking suit UK salon counters without a heavyweight install.",
      "UK stores renew at $15/month via USDT (BEP-20) after the free trial.",
      "Client history supports repeat custom common in UK salon culture.",
    ],
    faqs: [
      {
        question: "Do UK salons need a separate app?",
        answer: "Guests and staff use the browser. Native apps are on the roadmap; web is live today.",
      },
      {
        question: "How much does Beautora cost in the UK?",
        answer:
          "UK stores get a 30-day free trial, then $15/month via USDT on BNB Smart Chain (BEP-20).",
      },
      {
        question: "Can UK guests book online?",
        answer:
          "Yes. Each salon can publish a booking page so guests choose services, stylists, and times online.",
      },
    ],
  },
  {
    slug: "uae",
    title: "Salon Management Software in the UAE",
    description:
      "Beautora Salon Management, POS & Marketplace for UAE beauty businesses — online booking, POS, staff, and Marketplace retail for Dubai and beyond. $10/month Asia USDT pricing.",
    h1: "Salon Management Software in the UAE",
    lead: "UAE salons move fast and serve international clients. Beautora supports online booking, salon POS, team coordination, and Marketplace retail.",
    localNotes: [
      "English-first interface suitable for diverse salon teams.",
      "UAE is in Asia pricing — $10/month USDT after the free trial.",
      "Public booking reduces WhatsApp-only scheduling pressure.",
    ],
    faqs: [
      {
        question: "Can salons in Dubai use Beautora?",
        answer: "Yes. Beautora is built for international beauty businesses, including the UAE.",
      },
      {
        question: "How much does Beautora cost in the UAE?",
        answer:
          "UAE stores get a 30-day free trial, then $10/month (Asia rate) via USDT on BNB Smart Chain (BEP-20).",
      },
      {
        question: "Is Beautora only for Dubai?",
        answer:
          "No. Any UAE beauty business can use Beautora — Dubai, Abu Dhabi, Sharjah, and beyond.",
      },
    ],
  },
  {
    slug: "pakistan",
    title: "Salon Management Software in Pakistan",
    description:
      "Beautora Salon Management, POS & Marketplace for Pakistan — $10/month Asia USDT billing, online booking, salon POS, staff, public directory, and Marketplace COD shop.",
    h1: "Salon Management Software in Pakistan",
    lead: "Beautora started with strong Pakistan operations in mind — Asia USDT subscription pricing, Pakistan timezone booking, a public directory, and Marketplace COD — while remaining a global Salon Management, POS & Marketplace product.",
    localNotes: [
      "Pakistan stores renew at $10/month via USDT (BEP-20) after the free trial.",
      "Booking times follow Pakistan Standard Time for local stores.",
      "Guests can discover salons via the Beautora stores directory.",
    ],
    faqs: [
      {
        question: "Is Beautora only for Pakistan?",
        answer:
          "No. Pakistan is an important Asia market at the $10 rate, but Beautora serves beauty businesses worldwide ($15 outside Asia).",
      },
      {
        question: "How much does Beautora cost in Pakistan?",
        answer:
          "Pakistan stores get a 30-day free trial, then $10/month via USDT on BNB Smart Chain (BEP-20).",
      },
      {
        question: "Can customers find my salon online?",
        answer:
          "Yes. You can list on the Beautora stores directory and publish an online booking page for guests.",
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
