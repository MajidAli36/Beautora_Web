import { SUBSCRIPTION } from "@/lib/billing/subscription";

/** Minimal conversion-focused top bar (SyncOps/CEO live in footer). */
export function getMarketingTopBarMessage(): string {
  return `30 DAYS FREE · THEN RS ${SUBSCRIPTION.monthlyAmountPkr.toLocaleString("en-PK")} (PK) OR $${SUBSCRIPTION.usdtAmountUsd} USDT (INTL)`;
}
