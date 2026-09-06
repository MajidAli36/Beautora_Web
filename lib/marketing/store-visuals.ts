/** Decorative cover imagery for public store listing — never invents store names or cities. */

export type StoreVisual = {
  coverImage: string;
  coverAlt: string;
  logoInitials: string;
  accentFrom: string;
  accentTo: string;
};

const FALLBACK_COVERS = [
  {
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80",
    alt: "Salon floor with styling chairs",
  },
  {
    src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=80",
    alt: "Hair styling in progress",
  },
  {
    src: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1600&q=80",
    alt: "Calm salon interior",
  },
  {
    src: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1600&q=80",
    alt: "Salon tools and station",
  },
] as const;

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i += 1) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function getStoreVisual(slug: string, name: string): StoreVisual {
  const h = hashSlug(slug || name);
  const cover = FALLBACK_COVERS[h % FALLBACK_COVERS.length]!;
  return {
    coverImage: cover.src,
    coverAlt: `${name} — ${cover.alt}`,
    logoInitials: initialsFromName(name),
    accentFrom: "#0c1f1c",
    accentTo: "#3d6b5f",
  };
}
