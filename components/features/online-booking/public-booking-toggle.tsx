"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPublicBookingEnabled } from "@/lib/actions/appointments";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

type PublicBookingToggleProps = {
  enabled: boolean;
  canManage: boolean;
};

/** Online booking header: turn public booking on/off (not the whole store listing). */
export function PublicBookingToggle({
  enabled: initial,
  canManage,
}: PublicBookingToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onChange(next: boolean) {
    if (!canManage || pending) return;
    const previous = enabled;
    setEnabled(next);

    startTransition(async () => {
      const result = await setPublicBookingEnabled(next);
      if (result.error) {
        setEnabled(previous);
        notify.error(result.error);
        return;
      }
      notify.success(
        next
          ? "Online booking is enabled for customers."
          : "Online booking is disabled — Book buttons are hidden."
      );
      router.refresh();
    });
  }

  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 shadow-none transition-all duration-150",
        "hover:border-primary/30 hover:shadow-sm",
        "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        !canManage && "cursor-not-allowed opacity-60",
        pending && "opacity-70"
      )}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none"
        checked={enabled}
        disabled={!canManage || pending}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby="public-booking-help"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground whitespace-nowrap">
          Enable online booking
        </span>
        <span id="public-booking-help" className="mt-0.5 block text-[11px] text-muted-foreground">
          {enabled ? "Customers can book online" : "Book buttons hidden"}
        </span>
      </span>
    </label>
  );
}
