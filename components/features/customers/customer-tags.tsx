"use client";

import { cn } from "@/lib/utils";

const TAG_STYLES: Record<string, string> = {
  vip: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  new: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200",
  bridal: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950/50 dark:text-fuchsia-200",
  regular: "bg-primary/10 text-primary",
};

export function customerTagClass(tag: string) {
  return TAG_STYLES[tag.trim().toLowerCase()] ?? "bg-muted text-muted-foreground";
}

export function CustomerTagPills({
  tags,
  emptyLabel = "—",
  className,
}: {
  tags?: string[] | null;
  emptyLabel?: string;
  className?: string;
}) {
  if (!tags?.length) {
    return <span className={cn("text-sm text-muted-foreground", className)}>{emptyLabel}</span>;
  }
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <span
          key={tag}
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            customerTagClass(tag)
          )}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-emerald-100 text-emerald-700",
];

export function CustomerAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const color = AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        color,
        size === "sm" && "size-8 text-[11px]",
        size === "md" && "size-10 text-xs",
        size === "lg" && "size-14 text-base"
      )}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}
