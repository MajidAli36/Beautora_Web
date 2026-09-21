"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

type LedgerInsert = Database["public"]["Tables"]["marketplace_seller_ledger"]["Insert"];
type LedgerEntryType = LedgerInsert["entry_type"];

export async function appendSellerLedger(entry: LedgerInsert): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.from("marketplace_seller_ledger").insert(entry);
  if (error) {
    // Idempotency conflict = already recorded
    if (error.code === "23505") return {};
    return { error: error.message };
  }
  return {};
}

export async function getSellerLedgerBalance(sellerId: string): Promise<{
  available: number;
  credits: number;
  debits: number;
}> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_seller_ledger")
    .select("entry_type, amount")
    .eq("seller_id", sellerId);

  let credits = 0;
  let debits = 0;
  for (const row of data ?? []) {
    const amt = Number(row.amount);
    if (row.entry_type === "SELLER_CREDIT" || row.entry_type === "ADJUSTMENT") {
      if (amt >= 0) credits += amt;
      else debits += Math.abs(amt);
    } else if (
      row.entry_type === "SELLER_DEBIT" ||
      row.entry_type === "COMMISSION" ||
      row.entry_type === "REFUND" ||
      row.entry_type === "PAYOUT"
    ) {
      debits += Math.abs(amt);
    }
  }
  return { available: credits - debits, credits, debits };
}

export async function listSellerLedger(sellerId: string, limit = 50) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_seller_ledger")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * On seller-order delivered: credit seller (gross - commission) + commission debit.
 * Idempotent via idempotency_key.
 */
export async function recordDeliveryLedger(input: {
  sellerId: string;
  orderId: string;
  sellerOrderId: string;
  grossAmount: number;
  commissionAmount: number;
  commissionId?: string | null;
  createdBy?: string | null;
}): Promise<{ error?: string }> {
  const sellerNet = Math.round((input.grossAmount - input.commissionAmount) * 100) / 100;
  const creditKey = `deliver_credit:${input.sellerOrderId}`;
  const commissionKey = `deliver_commission:${input.sellerOrderId}`;

  const credit = await appendSellerLedger({
    seller_id: input.sellerId,
    entry_type: "SELLER_CREDIT" as LedgerEntryType,
    amount: sellerNet,
    currency: "PKR",
    order_id: input.orderId,
    seller_order_id: input.sellerOrderId,
    commission_id: input.commissionId ?? null,
    idempotency_key: creditKey,
    notes: "Order delivered — seller credit",
    created_by: input.createdBy ?? null,
  });
  if (credit.error) return credit;

  if (input.commissionAmount > 0) {
    const commission = await appendSellerLedger({
      seller_id: input.sellerId,
      entry_type: "COMMISSION" as LedgerEntryType,
      amount: input.commissionAmount,
      currency: "PKR",
      order_id: input.orderId,
      seller_order_id: input.sellerOrderId,
      commission_id: input.commissionId ?? null,
      idempotency_key: commissionKey,
      notes: "Platform commission",
      created_by: input.createdBy ?? null,
    });
    if (commission.error) return commission;
  }

  return {};
}
