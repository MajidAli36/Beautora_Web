"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Hero backgrounds: salon interiors, stations, makeup & beauty products only.
 * No identifiable people / faces.
 * Only active + next slide mount so we don't optimize 12×2400px images at once.
 */
const HERO_SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1400&q=70",
    alt: "Modern salon styling stations and mirrors",
  },
  {
    src: "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?auto=format&fit=crop&w=1400&q=70",
    alt: "Calm empty salon interior with warm lighting",
  },
  {
    src: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=1400&q=70",
    alt: "Salon chairs lined along the mirrors",
  },
  {
    src: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1400&q=70",
    alt: "Salon workstation with tools and products",
  },
  {
    src: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1400&q=70",
    alt: "Spa and beauty treatment room interior",
  },
  {
    src: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=70",
    alt: "Makeup palette and beauty cosmetics flat lay",
  },
  {
    src: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1400&q=70",
    alt: "Makeup brushes and cosmetic products",
  },
  {
    src: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1400&q=70",
    alt: "Hair coloring tools and salon product bottles",
  },
  {
    src: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=1400&q=70",
    alt: "Beauty and skincare products on display",
  },
  {
    src: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1400&q=70",
    alt: "Skincare bottles and beauty care products",
  },
  {
    src: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=1400&q=70",
    alt: "Skincare and beauty product bottles arranged on a shelf",
  },
  {
    src: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1400&q=70",
    alt: "Makeup and cosmetic product flat lay",
  },
] as const;

const ROTATE_MS = 3000;

export function LandingHeroBackground() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setActive((current) => (current + 1) % HERO_SLIDES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const next = (active + 1) % HERO_SLIDES.length;
  const visibleIndexes = active === next ? [active] : [active, next];

  return (
    <div className="absolute inset-0">
      {visibleIndexes.map((index) => {
        const slide = HERO_SLIDES[index]!;
        return (
          <Image
            key={`${slide.src}-${index}`}
            src={slide.src}
            alt={slide.alt}
            fill
            priority={index === active}
            sizes="100vw"
            className={cn(
              "object-cover object-center transition-opacity duration-700 ease-out",
              index === active ? "opacity-100" : "opacity-0"
            )}
          />
        );
      })}
      <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(6,33,29,0.94)_0%,rgba(6,33,29,0.72)_46%,rgba(6,33,29,0.42)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,33,29,0.78)_0%,transparent_45%)]" />
    </div>
  );
}
