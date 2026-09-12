import type { CommercialPage } from "@/lib/seo/content/commercial";

/** Industry pages — unique intent; not clones of the hub. */
export const INDUSTRY_PAGES: CommercialPage[] = [
  {
    slug: "software-for-hair-salons",
    path: "/software-for-hair-salons",
    navLabel: "Hair salons",
    title: "Software for Hair Salons",
    description:
      "Beautora software for hair salons — online booking, stylist schedules, POS, retail, and team tools for color and cut businesses worldwide.",
    h1: "Software for Hair Salons",
    lead: "Color services, timed appointments, and retail add-ons need software that understands chair time — not a generic calendar.",
    keywords: ["hair salon software", "software for hair salons", "hair salon booking POS"],
    problems: [
      {
        title: "Long services, tight chairs",
        body: "Color and treatments block chairs for hours. Schedules must respect duration and stylist skill.",
      },
    ],
    capabilities: [
      {
        title: "Service-aware booking",
        body: "Durations and stylist assignment keep the book honest.",
      },
      {
        title: "Retail at checkout",
        body: "Recommend and sell care products in the same POS flow.",
      },
      {
        title: "Team visibility",
        body: "See who is booked, on duty, and credited on the ticket.",
      },
    ],
    whoFor: ["Cut & color salons", "Blow-dry bars", "Multi-stylist hair floors"],
    faqs: [
      {
        question: "Can guests pick a stylist?",
        answer: "Yes. Online booking can offer stylist choice based on schedules and services.",
      },
    ],
    related: [
      { label: "Salon booking", href: "/salon-booking-software" },
      { label: "Salon POS", href: "/salon-pos" },
      { label: "Salon management", href: "/salon-management-software" },
    ],
  },
  {
    slug: "software-for-beauty-salons",
    path: "/software-for-beauty-salons",
    navLabel: "Beauty salons",
    title: "Software for Beauty Salons",
    description:
      "Beautora for beauty salons — booking, POS, staff, inventory, and client history for makeup, facials, and full-service beauty studios.",
    h1: "Software for Beauty Salons",
    lead: "Full-service beauty floors mix short and long appointments. Beautora keeps booking, checkout, and clients in one place.",
    keywords: ["beauty salon software", "software for beauty salons"],
    problems: [
      {
        title: "Mixed service menus",
        body: "Facials, threading, and packages need clear pricing and timing online and at POS.",
      },
    ],
    capabilities: [
      {
        title: "Unified catalog",
        body: "Services and products stay consistent from booking to receipt.",
      },
      {
        title: "Client history",
        body: "Remember what guests booked and bought last time.",
      },
    ],
    whoFor: ["Full-service beauty salons", "Bridal beauty teams"],
    faqs: [
      {
        question: "Can I list packages?",
        answer: "Services and pricing are managed in your catalog; present clear options on booking and POS.",
      },
    ],
    related: [
      { label: "Salon CRM", href: "/salon-crm" },
      { label: "Salon management", href: "/salon-management-software" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    slug: "spa-management-software",
    path: "/spa-management-software",
    navLabel: "Spas",
    title: "Spa Management Software",
    description:
      "Spa management software from Beautora — appointment booking, room/chair ops mindset, POS, and staff tools for spa and wellness studios.",
    h1: "Spa Management Software",
    lead: "Spas need calm scheduling and clear checkout. Beautora covers booking, team, and sales without spa-theater complexity.",
    keywords: ["spa management software", "spa booking software"],
    problems: [
      {
        title: "Overlapping treatments",
        body: "Back-to-back treatments fail when duration and staff availability are informal.",
      },
    ],
    capabilities: [
      {
        title: "Timed bookings",
        body: "Duration-aware scheduling protects treatment quality.",
      },
      {
        title: "Retail add-ons",
        body: "Checkout home-care products after the treatment.",
      },
    ],
    whoFor: ["Day spas", "Wellness studios with beauty services"],
    faqs: [
      {
        question: "Is Beautora a medical EMR?",
        answer: "No. Beautora is salon/spa operations software, not a clinical electronic medical record.",
      },
    ],
    related: [
      { label: "Med spa software", href: "/med-spa-software" },
      { label: "Salon booking", href: "/salon-booking-software" },
      { label: "Features", href: "/features" },
    ],
  },
  {
    slug: "nail-salon-software",
    path: "/nail-salon-software",
    navLabel: "Nail salons",
    title: "Nail Salon Software",
    description:
      "Nail salon software from Beautora — fast booking, technician schedules, POS, and walk-in queue for nail studios worldwide.",
    h1: "Nail Salon Software",
    lead: "Nail floors move quickly. Beautora helps with booking, walk-ins, and checkout so the desk stays ahead of the line.",
    keywords: ["nail salon software", "nail salon booking POS"],
    problems: [
      {
        title: "Walk-in surges",
        body: "Without a queue, the desk loses track of who arrived first.",
      },
    ],
    capabilities: [
      {
        title: "Queue + appointments",
        body: "Blend walk-ins with booked slots.",
      },
      {
        title: "Technician schedules",
        body: "Availability drives what guests can book online.",
      },
    ],
    whoFor: ["Nail studios", "Combo beauty + nails shops"],
    faqs: [
      {
        question: "Can I handle walk-ins?",
        answer: "Yes. Queue tools support walk-in flow alongside scheduled appointments.",
      },
    ],
    related: [
      { label: "Salon POS", href: "/salon-pos" },
      { label: "Salon management", href: "/salon-management-software" },
      { label: "How it works", href: "/how-it-works" },
    ],
  },
  {
    slug: "barbershop-management-software",
    path: "/barbershop-management-software",
    navLabel: "Barbershops",
    title: "Barbershop Management Software",
    description:
      "Barbershop management software from Beautora — chair booking, walk-in queue, POS, and staff tools for barbers worldwide.",
    h1: "Barbershop Management Software",
    lead: "Barbershops thrive on speed and fairness in the line. Beautora covers booking, queue, and checkout for modern barber floors.",
    keywords: ["barbershop software", "barbershop POS", "barber booking software"],
    problems: [
      {
        title: "Line disputes",
        body: "A clear queue reduces “who’s next?” arguments at the door.",
      },
    ],
    capabilities: [
      {
        title: "Walk-in tokens",
        body: "Keep arrival order visible.",
      },
      {
        title: "Barber schedules",
        body: "Online booking respects who is actually working.",
      },
      {
        title: "Fast POS",
        body: "Checkout cuts and retail without a separate till.",
      },
    ],
    whoFor: ["Neighborhood barbershops", "Multi-chair barber studios"],
    faqs: [
      {
        question: "Is Beautora only for full beauty salons?",
        answer: "No. Barbershops use the same booking, queue, and POS foundations.",
      },
    ],
    related: [
      { label: "Salon POS", href: "/salon-pos" },
      { label: "Salon booking", href: "/salon-booking-software" },
      { label: "Start free", href: "/signup" },
    ],
  },
  {
    slug: "med-spa-software",
    path: "/med-spa-software",
    navLabel: "Med spas",
    title: "Med Spa Software",
    description:
      "Med spa operations software from Beautora — booking, staff, POS, and client history for aesthetic studios. Not a clinical EMR.",
    h1: "Med Spa Software",
    lead: "Aesthetic studios need precise scheduling and clean checkout. Beautora supports operations — and we are clear it is not a medical EMR.",
    keywords: ["med spa software", "medspa booking software"],
    problems: [
      {
        title: "Consultation-to-service flow",
        body: "Guests move from inquiry to booked treatment; the book must stay accurate.",
      },
    ],
    capabilities: [
      {
        title: "Appointment control",
        body: "Duration-aware booking for treatment blocks.",
      },
      {
        title: "Client profiles",
        body: "Keep visit and purchase history with the studio.",
      },
    ],
    whoFor: ["Aesthetic studios", "Med spa fronts that need ops software first"],
    faqs: [
      {
        question: "Does Beautora store clinical charts?",
        answer:
          "Beautora is not an electronic medical record. Use dedicated clinical systems for medical documentation.",
      },
    ],
    related: [
      { label: "Spa management", href: "/spa-management-software" },
      { label: "Salon CRM", href: "/salon-crm" },
      { label: "Salon management", href: "/salon-management-software" },
    ],
  },
  {
    slug: "beauty-clinic-software",
    path: "/beauty-clinic-software",
    navLabel: "Beauty clinics",
    title: "Beauty Clinic Software",
    description:
      "Beauty clinic software from Beautora — appointments, team, POS, and customer history for clinic-style beauty businesses worldwide.",
    h1: "Beauty Clinic Software",
    lead: "Clinic-style beauty businesses need orderly appointments and clear billing. Beautora focuses on operations and guest experience.",
    keywords: ["beauty clinic software", "beauty clinic booking"],
    problems: [
      {
        title: "Front desk complexity",
        body: "Multiple practitioners and rooms of work need a single source of schedule truth.",
      },
    ],
    capabilities: [
      {
        title: "Multi-staff booking",
        body: "Assign practitioners through schedules and booking rules.",
      },
      {
        title: "Sales history",
        body: "Keep services and retail tied to the guest profile.",
      },
    ],
    whoFor: ["Beauty clinics", "Multi-specialist beauty studios"],
    faqs: [
      {
        question: "Is this hospital software?",
        answer: "No. Beautora is for beauty and wellness operations, not hospital information systems.",
      },
    ],
    related: [
      { label: "Salon staff management", href: "/salon-staff-management" },
      { label: "Salon management", href: "/salon-management-software" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
];

export function getIndustryPage(slug: string) {
  return INDUSTRY_PAGES.find((p) => p.slug === slug);
}
