import { createClient } from "@/lib/supabase/server";
import { computeSalePaymentState } from "@/lib/sales/payment-balance";
import { roundMoney } from "@/lib/sales/calculate";

/** Recalculate and persist denormalized payment fields on a sale. */
export async function syncSalePaymentDenorm(
  organizationId: string,
  saleId: string,
  options?: { expectedPaymentVersion?: number; bumpVersion?: boolean }
): Promise<ReturnType<typeof computeSalePaymentState>> {
  const supabase = await createClient();

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .select("id, total, status, payment_version")
    .eq("id", saleId)
    .eq("organization_id", organizationId)
    .single();

  if (saleErr || !sale) {
    throw new Error(saleErr?.message ?? "Sale not found for payment sync");
  }

  const currentVersion = Number(sale.payment_version ?? 1);
  if (
    options?.expectedPaymentVersion != null &&
    currentVersion !== options.expectedPaymentVersion
  ) {
    throw new Error("Invoice was updated by someone else — refresh and try again");
  }

  const [{ data: pays }, { data: refs }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("sale_id", saleId)
      .eq("organization_id", organizationId),
    supabase
      .from("sale_refunds")
      .select("amount")
      .eq("sale_id", saleId)
      .eq("organization_id", organizationId),
  ]);

  const paymentsSum = roundMoney(
    (pays ?? []).reduce((s, p) => s + Number(p.amount), 0)
  );
  const refundsSum = roundMoney(
    (refs ?? []).reduce((s, p) => s + Number(p.amount), 0)
  );
  const state = computeSalePaymentState({
    total: Number(sale.total),
    paymentsSum,
    refundsSum,
    saleStatus: sale.status,
  });

  const bump = options?.bumpVersion !== false;
  const nextVersion = bump ? currentVersion + 1 : currentVersion;

  let updateQuery = supabase
    .from("sales")
    .update({
      amount_paid: state.amountPaid,
      amount_refunded: state.amountRefunded,
      amount_due: state.amountDue,
      payment_status: state.paymentStatus,
      payment_version: nextVersion,
    })
    .eq("id", saleId)
    .eq("organization_id", organizationId);

  if (options?.expectedPaymentVersion != null) {
    updateQuery = updateQuery.eq("payment_version", options.expectedPaymentVersion);
  }

  const { data: updated, error } = await updateQuery.select("id").maybeSingle();

  if (error) throw new Error(error.message);
  if (options?.expectedPaymentVersion != null && !updated) {
    throw new Error("Invoice was updated by someone else — refresh and try again");
  }
  return state;
}
