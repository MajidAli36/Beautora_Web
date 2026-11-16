/** Local defaults so this module does not circular-import theme/index. */
const DEFAULT_PRIMARY = "#0F766E";
const DEFAULT_ACCENT = "#0EA5E9";

export type AppTheme = {
  primary: string;
  accent: string;
  bg: string;
  bgSoft: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  overlay: string;
};

export type ThemePresetId =
  | "salon"
  | "ocean"
  | "midnight"
  | "rose"
  | "forest"
  | "sunset"
  | "lavender"
  | "graphite";

export type ThemePreset = {
  id: ThemePresetId;
  name: string;
  description: string;
  primary: string;
  accent: string;
  bg: string;
  bgSoft: string;
  card: string;
  text: string;
  muted: string;
  border: string;
};

/** Built-in look & feel options shown after register / onboarding. */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "salon",
    name: "Salon brand",
    description: "Uses your salon’s published primary & accent colors",
    primary: DEFAULT_PRIMARY,
    accent: DEFAULT_ACCENT,
    bg: "#F4F6F8",
    bgSoft: "#E8EEF2",
    card: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    border: "#E2E8F0",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Fresh teal & sky",
    primary: "#0F766E",
    accent: "#0284C7",
    bg: "#F0FDFA",
    bgSoft: "#CCFBF1",
    card: "#FFFFFF",
    text: "#134E4A",
    muted: "#5B7C7A",
    border: "#99F6E4",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark mode with gold accents",
    primary: "#EAB308",
    accent: "#38BDF8",
    bg: "#0B1220",
    bgSoft: "#111827",
    card: "#151C2C",
    text: "#F8FAFC",
    muted: "#94A3B8",
    border: "#1F2937",
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft blush beauty look",
    primary: "#BE123C",
    accent: "#DB2777",
    bg: "#FFF1F2",
    bgSoft: "#FFE4E6",
    card: "#FFFFFF",
    text: "#4C0519",
    muted: "#9F1239",
    border: "#FECDD3",
  },
  {
    id: "forest",
    name: "Forest",
    description: "Calm greens",
    primary: "#166534",
    accent: "#65A30D",
    bg: "#F3F7F2",
    bgSoft: "#E3EDE3",
    card: "#FFFFFF",
    text: "#14532D",
    muted: "#4D7C5A",
    border: "#BBF7D0",
  },
  {
    id: "sunset",
    name: "Sunset",
    description: "Warm orange energy",
    primary: "#C2410C",
    accent: "#EA580C",
    bg: "#FFF7ED",
    bgSoft: "#FFEDD5",
    card: "#FFFFFF",
    text: "#7C2D12",
    muted: "#9A3412",
    border: "#FED7AA",
  },
  {
    id: "lavender",
    name: "Lavender",
    description: "Soft violet spa vibe",
    primary: "#6D28D9",
    accent: "#A855F7",
    bg: "#F5F3FF",
    bgSoft: "#EDE9FE",
    card: "#FFFFFF",
    text: "#2E1065",
    muted: "#6B21A8",
    border: "#DDD6FE",
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Minimal charcoal",
    primary: "#334155",
    accent: "#0EA5E9",
    bg: "#F8FAFC",
    bgSoft: "#E2E8F0",
    card: "#FFFFFF",
    text: "#0F172A",
    muted: "#64748B",
    border: "#CBD5E1",
  },
];

export function getThemePreset(id: ThemePresetId | string | null | undefined) {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

export function buildThemeFromPreset(
  presetId: ThemePresetId | string | null | undefined,
  brandPrimary?: string,
  brandAccent?: string
): AppTheme {
  const preset = getThemePreset(presetId);
  const useBrand = preset.id === "salon";
  return {
    primary: useBrand ? brandPrimary || preset.primary : preset.primary,
    accent: useBrand ? brandAccent || preset.accent : preset.accent,
    bg: preset.bg,
    bgSoft: preset.bgSoft,
    card: preset.card,
    text: preset.text,
    muted: preset.muted,
    border: preset.border,
    danger: "#B91C1C",
    success: "#15803D",
    warning: "#B45309",
    overlay: preset.id === "midnight" ? "rgba(0,0,0,0.55)" : "rgba(15, 23, 42, 0.5)",
  };
}

export function isDarkTheme(presetId: ThemePresetId | string | null | undefined) {
  return getThemePreset(presetId).id === "midnight";
}
