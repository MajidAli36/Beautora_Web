/** Platform brand — Beautora salon OS (product by SyncOps) */
export const SYNCOPS = {
  name: "Beautora",
  url: "https://beautora.app",
  domain: "beautora.app",
  email: "info@beautora.app",
  phone: "+92301 8678319",
  phoneDisplay: "+92 301 8678319",
  label: "Powered by Beautora",
  line: "Powered by Beautora · +92301 8678319 · beautora.app",
  seoDescription:
    "Beautora builds salon POS, online booking, attendance, and operations software for modern beauty brands.",
  html: `<span class="credit">Powered by <strong>Beautora</strong> · <a href="tel:+923018678319">+92301 8678319</a> · <a href="https://beautora.app" rel="noopener noreferrer me author">beautora.app</a></span>`,
  /** Parent studio / product house */
  builder: {
    name: "SyncOps",
    url: "https://syncops.tech",
    domain: "syncops.tech",
    label: "Built by SyncOps",
    short: "Beautora — a SyncOps product",
  },
  /** Thermal receipt footer lines (POS, token, appointment) */
  receipt: {
    builtBy: "Built by SyncOps",
    platform: "Platform Beautora",
  },
  social: {
    linkedin: "https://www.linkedin.com",
    github: "https://github.com",
    instagram: "https://www.instagram.com",
  },
  ceo: {
    name: "Majid Ali",
    role: "Founder & CEO",
    photo: "/brand/ceo-majid-ali.png",
    initials: "MA",
    /** Short line for the marketing top bar */
    ticker:
      "We build partnerships that drive lasting success — Majid Ali, Founder & CEO",
  },
} as const;

/** Prefer this alias in new code */
export const BEAUTORA = SYNCOPS;
