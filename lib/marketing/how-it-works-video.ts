/**
 * How-it-works media catalog — Cloudinary delivery tuned for fast first paint.
 * Add new languages by appending to HOW_IT_WORKS_LANGUAGES.
 */

const CLOUD = "pbllq9kr";
const base = `https://res.cloudinary.com/${CLOUD}/video/upload`;

export type HowItWorksVideoSource = {
  id: string;
  /** Tab label (Latin) */
  label: string;
  /** Optional native-script label e.g. اردو */
  nativeLabel?: string;
  /** BCP 47 for dir / accessibility */
  lang: string;
  dir?: "ltr" | "rtl";
  title: string;
  poster: string;
  mp4: string;
  mp4Mobile: string;
};

function cloudVideo(version: string, publicId: string): Omit<
  HowItWorksVideoSource,
  "id" | "label" | "nativeLabel" | "lang" | "dir" | "title"
> {
  return {
    poster: `${base}/so_0,w_1280,h_720,c_fill,q_auto,f_jpg/${version}/${publicId}.jpg`,
    mp4: `${base}/q_auto:eco,c_limit,w_1280/${version}/${publicId}.mp4`,
    mp4Mobile: `${base}/q_auto:eco,c_limit,w_720/${version}/${publicId}.mp4`,
  };
}

/** Spoken walkthroughs by language — order = tab order. */
export const HOW_IT_WORKS_LANGUAGES: HowItWorksVideoSource[] = [
  {
    id: "en",
    label: "English",
    lang: "en",
    dir: "ltr",
    title: "Beautora walkthrough — English",
    ...cloudVideo("v1789761058", "WhatsApp_Video_2026-09-19_at_12.27.24_AM"),
  },
  {
    id: "ur",
    label: "Urdu",
    nativeLabel: "اردو",
    lang: "ur",
    dir: "rtl",
    title: "Beautora walkthrough — Urdu",
    ...cloudVideo("v1789914497", "Beautora_WorkFlow_Urdu"),
  },
];

export const HOW_IT_WORKS_TUTORIAL_STEPS = [
  {
    step: "01",
    title: "Create your store",
    body: "Sign up, name the salon, pick your country, and invite owners or managers.",
  },
  {
    step: "02",
    title: "Build the catalog",
    body: "Add services, products, chairs, staff schedules, and booking rules.",
  },
  {
    step: "03",
    title: "Go live on the floor",
    body: "Take bookings, run POS checkout, manage the queue, and message guests on WhatsApp.",
  },
  {
    step: "04",
    title: "Sell online",
    body: "List Marketplace products, take COD orders, and keep shop stock separate from salon POS.",
  },
  {
    step: "05",
    title: "Review & renew",
    body: "Check reports and finances, then renew from Billing after your free trial.",
  },
] as const;

/** @deprecated Prefer HOW_IT_WORKS_LANGUAGES[0] */
export const HOW_IT_WORKS_VIDEO = HOW_IT_WORKS_LANGUAGES[0]!;
