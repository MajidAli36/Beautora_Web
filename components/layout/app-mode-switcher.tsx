"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, LayoutGrid, Smartphone, Store } from "lucide-react";
import { setAppMode } from "@/lib/marketplace/actions";
import type { AppMode } from "@/lib/marketplace/constants";
import type { ProductIntent } from "@/lib/auth/account-types";
import { productIntentAllowsMode } from "@/lib/auth/account-types";
import { BEAUTORA_PRODUCTS } from "@/lib/marketing/products";
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
  /** Super Admin enabled a customer app for this salon */
  customerAppEnabled?: boolean;
};

export function AppModeSwitcherItems({
  mode,
  productIntent = "both",
  customerAppEnabled = false,
}: AppModeSwitcherItemsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const allowSaas = productIntentAllowsMode(productIntent, "saas");
  const allowMarketplace = productIntentAllowsMode(productIntent, "marketplace");

  function switchTo(next: AppMode) {
    if (next === mode || pending) return;
    if (next === "customer_app") {
      if (!customerAppEnabled) {
        notify.error(
          "App dashboard not enabled yet. Ask Beautora Super Admin (Platform → Customer apps)."
        );
        return;
      }
    } else if (!productIntentAllowsMode(productIntent, next)) {
      notify.error("This product is not enabled for your workspace.");
      return;
    }
    startTransition(async () => {
      const res = await setAppMode(next);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      const label =
        next === "marketplace"
          ? BEAUTORA_PRODUCTS.marketplace.name
          : next === "customer_app"
            ? BEAUTORA_PRODUCTS.customer_app.name
            : BEAUTORA_PRODUCTS.saas.name;
      notify.success(`Switched to ${label}.`);
      router.push(
        next === "marketplace"
          ? "/marketplace"
          : next === "customer_app"
            ? "/customer-app"
            : "/dashboard"
      );
      router.refresh();
    });
  }

  const options: {
    id: AppMode;
    visible: boolean;
    icon: typeof LayoutGrid;
  }[] = [
    { id: "saas", visible: allowSaas, icon: LayoutGrid },
    { id: "marketplace", visible: allowMarketplace, icon: Store },
    { id: "customer_app", visible: customerAppEnabled, icon: Smartphone },
  ];

  const visible = options.filter((o) => o.visible);
  if (visible.length <= 1 && !customerAppEnabled) {
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
            Switch workspace
          </span>
          <span className="block text-xs font-medium leading-snug text-foreground/80 normal-case tracking-normal">
            Salon POS · Marketplace
            {customerAppEnabled ? " · App dashboard" : ""}
          </span>
        </DropdownMenuLabel>

        {visible.map(({ id, icon: Icon }) => {
          const product = BEAUTORA_PRODUCTS[id];
          return (
            <DropdownMenuItem
              key={id}
              disabled={pending}
              onClick={() => switchTo(id)}
              className={cn(
                "items-start gap-2.5 py-2.5",
                mode === id && "bg-primary/8 focus:bg-primary/10"
              )}
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{product.name}</span>
                  {mode === id ? (
                    <Check className="size-3.5 shrink-0 text-primary" />
                  ) : null}
                </span>
                <span className="block text-[11px] leading-snug text-muted-foreground whitespace-normal">
                  {product.description}
                </span>
              </span>
            </DropdownMenuItem>
          );
        })}

        {!customerAppEnabled ? (
          <p className="px-2 py-2 text-[11px] leading-snug text-muted-foreground">
            App dashboard appears here after Super Admin enables Customer apps for your
            salon.
          </p>
        ) : null}
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
    </>
  );
}
