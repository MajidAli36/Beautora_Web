/** Pure helpers for seller ledger math (no server actions). */

/** Expected available balance after delivery: credit gross, debit commission once. */
export function sellerAvailableAfterDelivery(
  grossAmount: number,
  commissionAmount: number
): number {
  const gross = Math.round(Number(grossAmount) * 100) / 100;
  const commission = Math.max(0, Math.round(Number(commissionAmount) * 100) / 100);
  return Math.round((gross - commission) * 100) / 100;
}
