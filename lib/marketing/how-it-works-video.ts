/**
 * How-it-works demo video — Cloudinary delivery tuned for fast first paint.
 * Poster loads instantly; MP4 is width-capped and only fetched when in view / played.
 */

const CLOUD = "pbllq9kr";
const VERSION = "v1789761058";
const PUBLIC_ID = "WhatsApp_Video_2026-09-19_at_12.27.24_AM";

const base = `https://res.cloudinary.com/${CLOUD}/video/upload`;

/** Still frame for LCP — JPG frame, no video bytes. */
export const HOW_IT_WORKS_POSTER = `${base}/so_0,w_1280,h_720,c_fill,q_auto,f_jpg/${VERSION}/${PUBLIC_ID}.jpg`;

/**
 * Eco MP4 for desktop — Cloudinary re-encodes lighter than the original ~42MB upload.
 */
export const HOW_IT_WORKS_VIDEO_MP4 = `${base}/q_auto:eco,c_limit,w_1280/${VERSION}/${PUBLIC_ID}.mp4`;

/** Lighter source for phones. */
export const HOW_IT_WORKS_VIDEO_MP4_MOBILE = `${base}/q_auto:eco,c_limit,w_720/${VERSION}/${PUBLIC_ID}.mp4`;

export const HOW_IT_WORKS_VIDEO = {
  poster: HOW_IT_WORKS_POSTER,
  mp4: HOW_IT_WORKS_VIDEO_MP4,
  mp4Mobile: HOW_IT_WORKS_VIDEO_MP4_MOBILE,
  title: "Beautora walkthrough — from signup to a live salon floor",
} as const;
