export type DepositStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED";

export type DepositLine = {
  id?: string;
  amount: number;
  status?: DepositStatus | string;
  applied_to_sale_id?: string | null;
  payment_reference?: string | null;
  proof_path?: string | null;
  method?: string;
  notes?: string | null;
  refund_reason?: string | null;
  refund_method?: string | null;
  refunded_at?: string | null;
  paid_at?: string | null;
};

export type AdvanceSettings = {
  booking_advance_amount?: number | null;
  booking_advance_percent?: number | null;
};

export function sumServicePrices(services: { price: number }[]): number {
  return services.reduce((sum, s) => sum + Number(s.price), 0);
}

/**
 * Online advance from salon settings.
 * Fixed amount wins when set; otherwise % of selected services.
 * Both 0 → no advance required.
 */
export function calculateRequiredAdvance(
  serviceTotal: number,
  settings: AdvanceSettings
): number {
  const total = Math.max(0, Number(serviceTotal) || 0);
  const fixed = Number(settings.booking_advance_amount ?? 0);
  if (fixed > 0) {
    return Math.round(Math.min(fixed, total || fixed) * 100) / 100;
  }

  const percent = Number(settings.booking_advance_percent ?? 0);
  if (percent > 0 && total > 0) {
    return Math.round((total * percent) / 100);
  }
  return 0;
}

export function getApprovedDepositTotal(deposits: DepositLine[]): number {
  return deposits
    .filter((d) => (d.status ?? "APPROVED") === "APPROVED" && !d.applied_to_sale_id)
    .reduce((sum, d) => sum + Number(d.amount), 0);
}

export function getPendingDepositTotal(deposits: DepositLine[]): number {
  return deposits
    .filter((d) => d.status === "PENDING")
    .reduce((sum, d) => sum + Number(d.amount), 0);
}

export function getRefundedDepositTotal(deposits: DepositLine[]): number {
  return deposits
    .filter((d) => d.status === "REFUNDED")
    .reduce((sum, d) => sum + Number(d.amount), 0);
}

export function getAppliedDepositTotal(deposits: DepositLine[]): number {
  return deposits
    .filter((d) => d.status === "APPROVED" && d.applied_to_sale_id)
    .reduce((sum, d) => sum + Number(d.amount), 0);
}

/** True when no more advance should be collected on this appointment. */
export function isAdvanceComplete(
  deposits: DepositLine[],
  serviceTotal: number,
  advanceSettings?: AdvanceSettings | null
): boolean {
  if (getPendingDepositTotal(deposits) > 0) return false;

  const required = advanceSettings
    ? calculateRequiredAdvance(serviceTotal, advanceSettings)
    : 0;
  const credited =
    getApprovedDepositTotal(deposits) + getAppliedDepositTotal(deposits);

  if (required > 0) return credited >= required;
  return credited > 0;
}

/** Whether staff can record another advance on this appointment. */
export function canCollectAdvance(
  deposits: DepositLine[],
  serviceTotal: number,
  advanceSettings?: AdvanceSettings | null
): boolean {
  if (getPendingDepositTotal(deposits) > 0) return false;
  if (isAdvanceComplete(deposits, serviceTotal, advanceSettings)) return false;
  return true;
}

export type AdvanceState = {
  required: number;
  approved: number;
  pending: number;
  refunded: number;
  applied: number;
  balanceDue: number;
  isComplete: boolean;
  hasPending: boolean;
};

export function getAdvanceState(
  deposits: DepositLine[],
  serviceTotal: number,
  advanceSettings?: AdvanceSettings | null
): AdvanceState {
  const required = advanceSettings
    ? calculateRequiredAdvance(serviceTotal, advanceSettings)
    : 0;
  const approved = getApprovedDepositTotal(deposits);
  const pending = getPendingDepositTotal(deposits);
  const refunded = getRefundedDepositTotal(deposits);
  const applied = getAppliedDepositTotal(deposits);
  const balanceDue = Math.max(0, serviceTotal - approved - applied);
  const isComplete = isAdvanceComplete(deposits, serviceTotal, advanceSettings);

  return {
    required,
    approved,
    pending,
    refunded,
    applied,
    balanceDue,
    isComplete,
    hasPending: pending > 0,
  };
}
