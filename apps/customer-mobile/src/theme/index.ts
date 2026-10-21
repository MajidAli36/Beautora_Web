export const fallbackColors = {
  primary: "#0F766E",
  accent: "#0EA5E9",
  bg: "#F4F6F8",
  bgSoft: "#E8EEF2",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  danger: "#B91C1C",
  success: "#15803D",
  warning: "#B45309",
  overlay: "rgba(15, 23, 42, 0.5)",
};

export const space = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export function themeFromBrand(primary?: string, accent?: string) {
  return {
    ...fallbackColors,
    primary: primary || fallbackColors.primary,
    accent: accent || fallbackColors.accent,
  };
}

export type AppTheme = ReturnType<typeof themeFromBrand>;
