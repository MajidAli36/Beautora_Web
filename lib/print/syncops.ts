/** Platform brand — Beautora salon OS (product by SyncOps) */
export const SYNCOPS = {
  name: "Beautora",
  url: "https://beautora.app",
  domain: "beautora.app",
  email: "info@beautora.app",
  phone: "+92301 8678319",
  phoneDisplay: "+92 301 8678319",
  label: "Powered by Beautora",
  line: "Powered by Beautora · Built by SyncOps · beautora.app · syncops.tech",
  seoDescription:
    "Beautora is the salon operating system from SyncOps — online booking, POS, staff, attendance, WhatsApp, and reports for modern beauty brands.",
  html: `<span class="credit">Powered by <strong>Beautora</strong> · Built by <strong>SyncOps</strong> · <a href="https://beautora.app" rel="noopener noreferrer me author">beautora.app</a> · <a href="https://syncops.tech" rel="noopener noreferrer me author">syncops.tech</a></span>`,
  /** Parent studio / product house */
  builder: {
    name: "SyncOps",
    url: "https://syncops.tech",
    domain: "syncops.tech",
    label: "Built by SyncOps",
    short: "Beautora — a SyncOps product",
    seoDescription:
      "SyncOps builds software products for real businesses. Beautora is our salon operating system for bookings, POS, staff, and operations.",
  },
  /** Thermal receipt footer lines (POS, token, appointment) */
  receipt: {
    builtBy: "Built by SyncOps",
    platform: "Platform Beautora",
  },
  social: {
    linkedin: "https://www.linkedin.com/in/majidali-syncops/",
    github: "https://github.com/MajidAli36",
    website: "https://majidali.tech",
    email: "majid@majidali.tech",
    instagram: "https://www.instagram.com",
  },
  ceo: {
    name: "Majid Ali",
    role: "Founder & CEO",
    photo: "/brand/ceo-majid-ali.png",
    initials: "MA",
    /** Personal / professional presence */
    links: {
      linkedin: "https://www.linkedin.com/in/majidali-syncops/",
      website: "https://majidali.tech",
      github: "https://github.com/MajidAli36",
      email: "majid@majidali.tech",
    },
    /** Short line for the marketing top bar */
    ticker:
      "We build partnerships that drive lasting success — Majid Ali, Founder & CEO",
  },
} as const;

/** Prefer this alias in new code */
export const BEAUTORA = SYNCOPS;
