import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  subtext?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  iconClassName?: string;
};

export function StatCard({
  label,
  value,
  subtext,
  change,
  changeType = "neutral",
  icon: Icon,
  iconClassName,
}: StatCardProps) {
  return (
    <div className="dashboard-card w-full p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5 sm:space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div>
            <p className="break-words text-xl font-bold tracking-tight text-foreground tabular-nums sm:text-2xl">
              {value}
            </p>
            {(change || subtext) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                {change ? (
                  <span
                    className={cn(
                      "delta-pill",
                      changeType === "positive" && "delta-pill-positive",
                      changeType === "negative" && "delta-pill-negative",
                      changeType === "neutral" && "delta-pill-neutral"
                    )}
                  >
                    {change}
                  </span>
                ) : null}
                {subtext ? (
                  <span className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                    {subtext}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted sm:size-11",
            iconClassName
          )}
        >
          <Icon className="size-4 text-muted-foreground sm:size-[18px]" />
        </div>
      </div>
    </div>
  );
}
