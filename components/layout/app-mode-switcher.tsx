"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, LayoutGrid, Store } from "lucide-react";
import { setAppMode } from "@/lib/marketplace/actions";
import type { AppMode } from "@/lib/marketplace/constants";
import type { ProductIntent } from "@/lib/auth/account-types";
import { productIntentAllowsMode } from "@/lib/auth/account-types";
import {
  BEAUTORA_PRODUCT_PAIR,
  BEAUTORA_PRODUCTS,
} from "@/lib/marketing/products";
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/toast";

type AppModeSwitcherItemsProps = {
  mode: AppMode;
  productIntent?: ProductIntent | null;
};

export function AppModeSwitcherItems({
  mode,
  productIntent = "both",
}: AppModeSwitcherItemsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const allowSaas = productIntentAllowsMode(productIntent, "saas");
  const allowMarketplace = productIntentAllowsMode(productIntent, "marketplace");
  const showSwitcher = allowSaas && allowMarketplace;

  function switchTo(next: AppMode) {
    if (next === mode || pending) return;
    if (!productIntentAllowsMode(productIntent, next)) {
      notify.error("This product is not enabled for your workspace.");
      return;
    }
    startTransition(async () => {
      const res = await setAppMode(next);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      router.push(next === "marketplace" ? "/marketplace" : "/dashboard");
      router.refresh();
    });
  }

  if (!showSwitcher) {
    return (
      <>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel className="space-y-0.5 px-1.5 py-2">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Workspace
            </span>
            <span className="block text-xs font-medium leading-snug text-foreground/80 normal-case tracking-normal">
              {productIntent === "marketplace"
                ? "Marketplace only — configured at signup"
                : "Salon POS only — configured at signup"}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
      </>
    );
  }

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel className="space-y-0.5 px-1.5 py-2">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Beautora products
          </span>
          <span className="block text-xs font-medium leading-snug text-foreground/80 normal-case tracking-normal">
            {BEAUTORA_PRODUCT_PAIR.subtitle}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuItem
          disabled={pending}
          onClick={() => switchTo("saas")}
          className={cn(
            "items-start gap-2.5 py-2.5",
            mode === "saas" && "bg-primary/8 focus:bg-primary/10"
          )}
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <LayoutGrid className="size-4" />
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">
                {BEAUTORA_PRODUCTS.saas.name}
              </span>
              {mode === "saas" ? (
                <Check className="size-3.5 shrink-0 text-primary" />
              ) : null}
            </span>
            <span className="block text-[11px] leading-snug text-muted-foreground whitespace-normal">
              {BEAUTORA_PRODUCTS.saas.description}
            </span>
          </span>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={pending}
          onClick={() => switchTo("marketplace")}
          className={cn(
            "items-start gap-2.5 py-2.5",
            mode === "marketplace" && "bg-primary/8 focus:bg-primary/10"
          )}
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
            <Store className="size-4" />
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">
                {BEAUTORA_PRODUCTS.marketplace.name}
              </span>
              {mode === "marketplace" ? (
                <Check className="size-3.5 shrink-0 text-primary" />
              ) : null}
            </span>
            <span className="block text-[11px] leading-snug text-muted-foreground whitespace-normal">
              {BEAUTORA_PRODUCTS.marketplace.description}
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  );
}
