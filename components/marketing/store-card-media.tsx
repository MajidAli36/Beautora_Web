import Image from "next/image";
import type { PublicStore } from "@/lib/actions/stores";
import { cn } from "@/lib/utils";

/** Prefer uploaded cover; otherwise marketing fallback image. */
export function storeCoverSrc(store: Pick<PublicStore, "coverUrl" | "visual" | "name">) {
  return {
    src: store.coverUrl ?? store.visual.coverImage,
    alt: store.coverUrl ? `${store.name} cover` : store.visual.coverAlt,
    isUploaded: Boolean(store.coverUrl),
  };
}

type StoreCardMediaProps = {
  store: PublicStore;
  sizes?: string;
  className?: string;
  priority?: boolean;
};

export function StoreCardMedia({
  store,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  priority = false,
}: StoreCardMediaProps) {
  const cover = storeCoverSrc(store);

  return (
    <div className={cn("relative aspect-[4/3] overflow-hidden bg-[var(--m-mist)]", className)}>
      {cover.isUploaded ? (
        // Signed storage URLs change; native img avoids Next image optimizer cache issues.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover.src}
          alt={cover.alt}
          className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <Image
          src={cover.src}
          alt={cover.alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(12,31,28,0.55)_0%,transparent_55%)]" />
      <div
        className="absolute bottom-4 left-4 flex size-12 items-center justify-center overflow-hidden text-sm font-semibold text-white ring-1 ring-white/30"
        style={{
          background: `linear-gradient(135deg, ${store.visual.accentFrom}, ${store.visual.accentTo})`,
        }}
      >
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt="" className="size-full object-cover" />
        ) : (
          store.visual.logoInitials
        )}
      </div>
    </div>
  );
}
