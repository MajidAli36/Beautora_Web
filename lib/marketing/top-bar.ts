import { SUBSCRIPTION } from "@/lib/billing/subscription";
import { SYNCOPS } from "@/lib/print/syncops";

export type TopBarSlide =
  | {
      id: string;
      kind: "product" | "ceo" | "alert";
      label: string;
      text: string;
      href?: string;
    };

/** Rotating slides for the marketing top notification bar */
export function getMarketingTopBarSlides(): TopBarSlide[] {
  return [
    {
      id: "product",
      kind: "product",
      label: "Product",
      text: SYNCOPS.builder.short,
      href: "/syncops",
    },
    {
      id: "ceo",
      kind: "ceo",
      label: "CEO",
      text: SYNCOPS.ceo.ticker,
      href: "/ceo",
    },
    {
      id: "alert-trial",
      kind: "alert",
      label: "Alert",
      text: `1 month free · then ${SUBSCRIPTION.currencyLabel} ${SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")}/month via JazzCash`,
      href: "/#pricing",
    },
  ];
}
