import Image from "next/image";
import { SYNCOPS } from "@/lib/print/syncops";
import { cn } from "@/lib/utils";

/** Canonical Beautora mark — transparent PNG in /public/brand */
export const BEAUTORA_LOGO_SRC = "/brand/beautora-logo.png" as const;

const SIZES = {
  xs: { box: "size-6", px: 24 },
  sm: { box: "size-7", px: 28 },
  md: { box: "size-8", px: 32 },
  lg: { box: "size-10", px: 40 },
  xl: { box: "size-12", px: 48 },
} as const;

type BeautoraLogoProps = {
  size?: keyof typeof SIZES;
  className?: string;
  /** When true, reserve square and contain the mark (recommended). */
  priority?: boolean;
};

/** Icon-only Beautora mark. */
export function BeautoraLogo({
  size = "md",
  className,
  priority = false,
}: BeautoraLogoProps) {
  const s = SIZES[size];
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", s.box, className)}
      aria-hidden
    >
      <Image
        src={BEAUTORA_LOGO_SRC}
        alt=""
        width={s.px}
        height={s.px}
        className="object-contain"
        priority={priority}
      />
    </span>
  );
}

type BeautoraWordmarkProps = {
  size?: keyof typeof SIZES;
  className?: string;
  /** Text color classes for the wordmark (not the icon). */
  textClassName?: string;
  showName?: boolean;
  priority?: boolean;
};

/** Mark + “Beautora” wordmark for headers, footers, auth. */
export function BeautoraWordmark({
  size = "md",
  className,
  textClassName,
  showName = true,
  priority = false,
}: BeautoraWordmarkProps) {
  const textSize =
    size === "xs" || size === "sm"
      ? "text-lg"
      : size === "lg" || size === "xl"
        ? "text-2xl sm:text-3xl"
        : "text-xl sm:text-2xl";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BeautoraLogo size={size} priority={priority} />
      {showName ? (
        <span
          className={cn(
            "font-display font-semibold tracking-tight",
            textSize,
            textClassName
          )}
        >
          {SYNCOPS.name}
        </span>
      ) : null}
    </span>
  );
}
