import { cn } from "@/lib/utils";

type SurfaceProps = React.ComponentProps<"div"> & {
  /** Soft lift on hover — only for clickable / interactive panels */
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
};

const paddingMap = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
} as const;

/**
 * Canonical SyncOps panel — white card, subtle border, optional hover lift.
 * Prefer this over ad-hoc `dashboard-card` class for new UI.
 */
export function Surface({
  className,
  interactive = false,
  padding = "md",
  ...props
}: SurfaceProps) {
  return (
    <div
      data-slot="surface"
      className={cn(
        "w-full min-w-0 rounded-xl border border-border bg-card shadow-none transition-all duration-150",
        interactive &&
          "hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0",
        paddingMap[padding],
        className
      )}
      {...props}
    />
  );
}
