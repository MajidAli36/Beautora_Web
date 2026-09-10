"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStorePublicListing } from "@/lib/actions/store-profile";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

type StorePublicListingToggleProps = {
  enabled: boolean;
  canManage: boolean;
};

/**
 * Settings header control: show / hide this salon on the public marketing site.
 * Online booking is controlled separately under Online booking.
 */
export function StorePublicListingToggle({
  enabled: initial,
  canManage,
}: StorePublicListingToggleProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function onChange(next: boolean) {
    if (!canManage || pending) return;
    const previous = enabled;
    setEnabled(next);

    startTransition(async () => {
      const result = await setStorePublicListing(next);
      if (result.error) {
        setEnabled(previous);
        notify.error(result.error);
        return;
      }
      notify.success(
        next
          ? "Store is now visible on the public site."
          : "Store is hidden from the public site."
      );
      router.refresh();
    });
  }

  return (
    <label
      className={cn(
        "flex min-h-11 w-full max-w-sm cursor-pointer items-start gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-none transition-all duration-150 sm:w-auto",
        "hover:border-primary/30 hover:shadow-sm",
        "has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        !canManage && "cursor-not-allowed opacity-60",
        pending && "opacity-70"
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary focus-visible:outline-none"
        checked={enabled}
        disabled={!canManage || pending}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby="public-listing-help"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          Show store publicly
        </span>
        <span id="public-listing-help" className="mt-0.5 block text-xs text-muted-foreground">
          List on homepage and store directory (booking is separate)
        </span>
      </span>
    </label>
  );
}
