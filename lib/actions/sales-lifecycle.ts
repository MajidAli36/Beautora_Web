"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { requireAction } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types/commerce";
import {
  calculateInvoiceTotals,
  calculateInventoryDelta,
  calculatePaymentAdjustment,
  type AmendPayload,
  roundMoney,
} from "@/lib/sales/calculate";
import { isPostedSaleStatus } from "@/lib/sales/lifecycle";
import { computeSalePaymentState } from "@/lib/sales/payment-balance";
import { syncSalePaymentDenorm } from "@/lib/sales/sync-payment-denorm";
import {
  applyUsageOverrides,
  calculateUsageInventoryDelta,
  getPackageUnitUsageCosts,
  getRecordedSaleUsage,
  getServiceUnitUsageCosts,
  replaceSaleUsageLines,
  resolveServiceUsageRequirements,
  servicePackageLinesUnchanged,
} from "@/lib/inventory/service-usage";
import { roundQty } from "@/lib/products/kinds";

function revalidateSalePaths(saleId: string) {
  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  revalidatePath(`/sales/${saleId}/edit`);
  revalidatePath("/reports");
  revalidatePath("/finances");
  revalidatePath("/products");
  revalidatePath("/in-house");
  revalidatePath("/services");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
}

async function sumPayments(saleId: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("amount")
    .eq("sale_id", saleId)
    .eq("organization_id", organizationId);
  return (data ?? []).reduce((s, p) => s + Number(p.amount), 0);
}

/** Cash/card tender only — deposit applications are restored via deposit unlink, not cash refund. */
async function sumRefundablePayments(saleId: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("amount, reference")
    .eq("sale_id", saleId)
    .eq("organization_id", organizationId);
  return (data ?? []).reduce((s, p) => {
    if (p.reference === "APPOINTMENT_DEPOSIT") return s;
    return s + Number(p.amount);
  }, 0);
}

async function sumRefunds(saleId: string, organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sale_refunds")
    .select("amount")
    .eq("sale_id", saleId)
    .eq("organization_id", organizationId);
  return (data ?? []).reduce((s, p) => s + Number(p.amount), 0);
}

/** Max cash/card still refundable on a posted sale (excludes deposit applications). */
export async function getSaleRefundableCash(saleId: string): Promise<number> {
  const { requireOrganization } = await import("@/lib/auth/organization");
  const org = await requireOrganization();
  const payments = await sumRefundablePayments(saleId, org.organizationId);
  const refunds = await sumRefunds(saleId, org.organizationId);
  return roundMoney(Math.max(0, payments - refunds));
}

async function ensureVersionOne(
  organizationId: string,
  sale: {
    id: string;
    customer_id: string | null;
    appointment_id: string | null;
    subtotal: number;
    discount: number;
    tax: number;
    deposit_applied: number;
    total: number;
    status: string;
    notes: string | null;
    current_version: number;
  },
  items: {
    item_type: string;
    item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[],
  paymentTotal: number,
  userId: string | null
) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("sale_versions")
    .select("id")
    .eq("sale_id", sale.id)
    .eq("version_number", 1)
    .maybeSingle();

  if (existing) return;

  const { data: version, error } = await supabase
    .from("sale_versions")
    .insert({
      organization_id: organizationId,
      sale_id: sale.id,
      version_number: 1,
      customer_id: sale.customer_id,
      appointment_id: sale.appointment_id,
      subtotal: sale.subtotal,
      discount: sale.discount,
      tax: sale.tax,
      deposit_applied: sale.deposit_applied,
      total: sale.total,
      payment_total: paymentTotal,
      status: sale.status,
      notes: sale.notes,
      change_reason: "Original completed invoice",
      changed_by: userId,
    })
    .select("id")
    .single();

  if (error || !version) throw new Error(error?.message ?? "Failed to snapshot version 1");

  if (items.length) {
    const { error: itemsError } = await supabase.from("sale_version_items").insert(
      items.map((item) => ({
        organization_id: organizationId,
        sale_version_id: version.id,
        item_type: item.item_type as "SERVICE" | "PRODUCT" | "PACKAGE",
        item_id: item.item_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }))
    );
    if (itemsError) throw new Error(itemsError.message);
  }
}

async function applyInventoryDeltas(
  organizationId: string,
  saleId: string,
  deltas: { productId: string; delta: number }[],
  userId: string | null
) {
  const supabase = await createClient();
  for (const { productId, delta } of deltas) {
    if (delta === 0) continue;
    // delta > 0 → more stock out; delta < 0 → restore stock (IN)
    const type = delta > 0 ? "OUT" : "IN";
    const quantity = Math.abs(delta);
    const { error } = await supabase.from("inventory_transactions").insert({
      organization_id: organizationId,
      product_id: productId,
      type,
      quantity,
      reference_type: type === "OUT" ? "sale_amend" : "sale_amend_reverse",
      reference_id: saleId,
      notes: type === "OUT" ? "Amendment stock out" : "Amendment stock restore",
      created_by: userId,
    });
    if (error) throw new Error(`Inventory update failed: ${error.message}`);
  }
}

/**
 * Restore retail product stock still outstanding for this sale.
 * Nets prior OUT (sale / sale_amend) against IN restores so void/refund never double-restores.
 * Returns the rows restored so callers can compensate if a later step fails.
 */
async function reverseAllProductStock(
  organizationId: string,
  saleId: string,
  _items: { item_type: string; item_id: string; quantity: number }[],
  userId: string | null,
  referenceType: string
): Promise<{ productId: string; quantity: number }[]> {
  const supabase = await createClient();
  const [{ data: outs }, { data: ins }] = await Promise.all([
    supabase
      .from("inventory_transactions")
      .select("product_id, quantity")
      .eq("organization_id", organizationId)
      .eq("reference_id", saleId)
      .eq("type", "OUT")
      .in("reference_type", ["sale", "sale_amend", "sale_refund_compensate"]),
    supabase
      .from("inventory_transactions")
      .select("product_id, quantity")
      .eq("organization_id", organizationId)
      .eq("reference_id", saleId)
      .eq("type", "IN")
      .in("reference_type", ["sale_void", "sale_amend_reverse", "sale_refund_full"]),
  ]);

  const net = new Map<string, number>();
  for (const row of outs ?? []) {
    net.set(
      row.product_id,
      Math.round(((net.get(row.product_id) ?? 0) + Number(row.quantity)) * 1000) / 1000
    );
  }
  for (const row of ins ?? []) {
    net.set(
      row.product_id,
      Math.round(((net.get(row.product_id) ?? 0) - Number(row.quantity)) * 1000) / 1000
    );
  }

  const restored: { productId: string; quantity: number }[] = [];
  for (const [productId, quantity] of net) {
    if (quantity <= 0.0005) continue;
    const { error } = await supabase.from("inventory_transactions").insert({
      organization_id: organizationId,
      product_id: productId,
      type: "IN",
      quantity,
      reference_type: referenceType,
      reference_id: saleId,
      notes: "Stock restored",
      created_by: userId,
    });
    if (error) throw new Error(`Inventory restore failed: ${error.message}`);
    restored.push({ productId, quantity });
  }
  return restored;
}

/** Undo a retail restore if refund money commit fails after stock was returned. */
async function compensateRetailRestore(
  organizationId: string,
  saleId: string,
  restored: { productId: string; quantity: number }[],
  userId: string | null
) {
  if (!restored.length) return;
  const supabase = await createClient();
  for (const row of restored) {
    const { error } = await supabase.from("inventory_transactions").insert({
      organization_id: organizationId,
      product_id: row.productId,
      type: "OUT",
      quantity: row.quantity,
      reference_type: "sale_refund_compensate",
      reference_id: saleId,
      notes: "Compensate — refund money commit failed after retail restore",
      created_by: userId,
    });
    if (error) {
      throw new Error(
        `Refund aborted and retail compensate failed for ${row.productId}: ${error.message}. Check stock manually.`
      );
    }
  }
}

/** Preview amendment financial impact (server-validated totals). */
export async function previewSaleAmendment(payload: AmendPayload) {
  const org = await requireAction("sales.edit");
  const supabase = await createClient();

  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", payload.saleId)
    .eq("organization_id", org.organizationId)
    .single();

  if (!sale) return { error: "Sale not found" };
  if (!isPostedSaleStatus(sale.status)) {
    return { error: "Only completed invoices can be amended" };
  }

  const totals = calculateInvoiceTotals(payload.items, payload.discount, payload.tax ?? 0);
  const paymentsTotal = await sumPayments(sale.id, org.organizationId);
  const refundsTotal = await sumRefunds(sale.id, org.organizationId);
  const cashRefundable = roundMoney(
    (await sumRefundablePayments(sale.id, org.organizationId)) - refundsTotal
  );
  const rawAdjustment = calculatePaymentAdjustment({
    oldTotal: Number(sale.total),
    newTotal: totals.total,
    paymentsTotal,
    refundsTotal,
  });
  // Never cash-refund deposit applications on amend — only refundable cash/card
  const adjustment = {
    ...rawAdjustment,
    refundDue: roundMoney(Math.min(rawAdjustment.refundDue, Math.max(0, cashRefundable))),
  };

  return {
    totals,
    adjustment,
    currentVersion: Number(sale.current_version ?? 1),
  };
}

export async function amendCompletedSale(
  payload: AmendPayload
): Promise<ActionResult & { saleId?: string; version?: number }> {
  const org = await requireAction("sales.edit");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  const reason = payload.changeReason?.trim() ?? "";
  if (reason.length < 3) return { error: "Change reason is required (min 3 characters)" };
  if (!payload.items?.length) return { error: "Invoice must have at least one line item" };

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .select("*")
    .eq("id", payload.saleId)
    .eq("organization_id", org.organizationId)
    .single();

  if (saleErr || !sale) return { error: saleErr?.message ?? "Sale not found" };
  if (!isPostedSaleStatus(sale.status)) {
    return { error: "Only completed / amended invoices can be edited" };
  }

  const currentVersion = Number(sale.current_version ?? 1);
  if (payload.expectedVersion !== currentVersion) {
    return {
      error:
        "This invoice was changed by someone else. Reload and try again (concurrency protection).",
    };
  }

  const { data: oldItems, error: itemsErr } = await supabase
    .from("sale_items")
    .select("item_type, item_id, name, quantity, unit_price, line_total")
    .eq("sale_id", sale.id)
    .eq("organization_id", org.organizationId);

  if (itemsErr) return { error: itemsErr.message };

  const totals = calculateInvoiceTotals(payload.items, payload.discount, payload.tax ?? 0);
  const paymentsTotal = await sumPayments(sale.id, org.organizationId);
  const refundsTotal = await sumRefunds(sale.id, org.organizationId);
  const cashRefundable = roundMoney(
    (await sumRefundablePayments(sale.id, org.organizationId)) - refundsTotal
  );
  const rawAdjustment = calculatePaymentAdjustment({
    oldTotal: Number(sale.total),
    newTotal: totals.total,
    paymentsTotal,
    refundsTotal,
  });
  const adjustment = {
    ...rawAdjustment,
    refundDue: roundMoney(Math.min(rawAdjustment.refundDue, Math.max(0, cashRefundable))),
  };

  if (adjustment.additionalDue > 0 && payload.settleAdditionalNow) {
    const pay = payload.additionalPayment;
    if (!pay || Math.abs(Number(pay.amount) - adjustment.additionalDue) > 0.009) {
      return {
        error: `Additional payment of ${adjustment.additionalDue} is required when settling now.`,
      };
    }
  }
  if (adjustment.additionalDue > 0 && payload.additionalPayment) {
    const payAmt = roundMoney(payload.additionalPayment.amount);
    if (payAmt > adjustment.additionalDue + 0.009 || payAmt <= 0) {
      return { error: "Additional payment must be between 0 and the new outstanding amount" };
    }
  }
  if (adjustment.refundDue > 0) {
    const ref = payload.refundPayment;
    if (!ref || Math.abs(Number(ref.amount) - adjustment.refundDue) > 0.009) {
      return {
        error: `Refund of ${adjustment.refundDue} must be confirmed (paid exceeds new total).`,
      };
    }
  }

  const deltas = calculateInventoryDelta(
    (oldItems ?? []).map((item) => ({
      itemType: item.item_type,
      itemId: item.item_id,
      quantity: Number(item.quantity),
    })),
    totals.lines
  );
  let inventoryApplied = false;
  let usageDeltasApplied: { productId: string; delta: number }[] = [];
  let itemsReplaced = false;
  let amendRefundId: string | null = null;
  let amendPaymentId: string | null = null;
  const oldItemRows = (oldItems ?? []).map((item) => ({
    organization_id: org.organizationId,
    sale_id: sale.id,
    item_type: item.item_type,
    item_id: item.item_id,
    name: item.name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    line_total: Number(item.line_total),
  }));

  try {
    // Claim version first so concurrent amends cannot both proceed.
    const { data: claimed, error: claimErr } = await supabase
      .from("sales")
      .update({
        current_version: currentVersion + 1,
        last_amended_at: new Date().toISOString(),
        last_amended_by: userId,
      })
      .eq("id", sale.id)
      .eq("organization_id", org.organizationId)
      .eq("current_version", currentVersion)
      .in("status", ["COMPLETED", "AMENDED"])
      .select("id")
      .maybeSingle();
    if (claimErr) throw new Error(claimErr.message);
    if (!claimed) {
      return {
        error:
          "This invoice was changed by someone else. Reload and try again (concurrency protection).",
      };
    }

    await ensureVersionOne(
      org.organizationId,
      {
        id: sale.id,
        customer_id: sale.customer_id,
        appointment_id: sale.appointment_id,
        subtotal: Number(sale.subtotal),
        discount: Number(sale.discount),
        tax: Number(sale.tax ?? 0),
        deposit_applied: Number(sale.deposit_applied ?? 0),
        total: Number(sale.total),
        status: sale.status,
        notes: sale.notes,
        current_version: currentVersion,
      },
      oldItems ?? [],
      paymentsTotal,
      userId
    );

    await applyInventoryDeltas(org.organizationId, sale.id, deltas, userId);
    inventoryApplied = true;

    const oldUsage = await getRecordedSaleUsage(org.organizationId, sale.id);
    if (oldUsage.error) throw new Error(oldUsage.error);

    const oldServiceFp = (oldItems ?? []).map((item) => ({
      itemType: item.item_type,
      itemId: item.item_id,
      quantity: Number(item.quantity),
    }));
    const newServiceFp = totals.lines.map((l) => ({
      itemType: l.itemType,
      itemId: l.itemId,
      quantity: l.quantity,
    }));
    const hasExplicitOverrides = (payload.usageOverrides?.length ?? 0) > 0;

    // Keep POS / prior usage snapshot when service/package lines are unchanged
    // and the owner did not send new overrides (avoids silent recipe rebase).
    let newUsage: { requirements: typeof oldUsage.requirements; error?: string };
    if (servicePackageLinesUnchanged(oldServiceFp, newServiceFp) && !hasExplicitOverrides) {
      newUsage = { requirements: oldUsage.requirements };
    } else {
      const newUsageResolved = await resolveServiceUsageRequirements(
        org.organizationId,
        totals.lines.map((l) => ({
          itemType: l.itemType,
          itemId: l.itemId,
          quantity: l.quantity,
        }))
      );
      if (newUsageResolved.error) throw new Error(newUsageResolved.error);

      newUsage = await applyUsageOverrides(
        org.organizationId,
        newUsageResolved.requirements,
        payload.usageOverrides ?? null
      );
      if (newUsage.error) throw new Error(newUsage.error);
    }

    const usageDeltas = calculateUsageInventoryDelta(
      oldUsage.requirements,
      newUsage.requirements
    );
    for (const { productId, delta } of usageDeltas) {
      if (Math.abs(delta) < 0.0005) continue;
      const type = delta > 0 ? "OUT" : "IN";
      const quantity = roundQty(Math.abs(delta));
      const { error: usageInvErr } = await supabase.from("inventory_transactions").insert({
        organization_id: org.organizationId,
        product_id: productId,
        type,
        quantity,
        reference_type:
          type === "OUT" ? "service_usage_amend" : "service_usage_amend_reverse",
        reference_id: sale.id,
        notes:
          type === "OUT"
            ? "Amendment in-house usage"
            : "Amendment in-house usage restore",
        created_by: userId,
      });
      if (usageInvErr) throw new Error(`In-house inventory update failed: ${usageInvErr.message}`);
    }
    usageDeltasApplied = usageDeltas;

    const snap = await replaceSaleUsageLines({
      organizationId: org.organizationId,
      saleId: sale.id,
      requirements: newUsage.requirements,
    });
    if (snap.error) throw new Error(snap.error);

    // Replace line items
    const { error: delErr } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", sale.id)
      .eq("organization_id", org.organizationId);
    if (delErr) throw new Error(delErr.message);
    itemsReplaced = true;

    // Snapshot costs for new product / service usage lines
    const productIds = [
      ...new Set(
        totals.lines.filter((l) => l.itemType === "PRODUCT").map((l) => l.itemId)
      ),
    ];
    const costById = new Map<string, number>();
    if (productIds.length) {
      const { data: products } = await supabase
        .from("products")
        .select("id, cost_price")
        .eq("organization_id", org.organizationId)
        .in("id", productIds);
      for (const p of products ?? []) {
        costById.set(p.id, Number(p.cost_price) || 0);
      }
    }
    const serviceIds = [
      ...new Set(
        totals.lines.filter((l) => l.itemType === "SERVICE").map((l) => l.itemId)
      ),
    ];
    const packageIds = [
      ...new Set(
        totals.lines.filter((l) => l.itemType === "PACKAGE").map((l) => l.itemId)
      ),
    ];
    const [serviceUsageCosts, packageUsageCosts] = await Promise.all([
      getServiceUnitUsageCosts(org.organizationId, serviceIds),
      getPackageUnitUsageCosts(org.organizationId, packageIds),
    ]);

    const { error: insErr } = await supabase.from("sale_items").insert(
      totals.lines.map((line) => ({
        organization_id: org.organizationId,
        sale_id: sale.id,
        item_type: line.itemType,
        item_id: line.itemId,
        name: line.name,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.lineTotal,
        unit_cost:
          line.itemType === "PRODUCT"
            ? roundMoney(costById.get(line.itemId) ?? 0)
            : line.itemType === "SERVICE"
              ? roundMoney(serviceUsageCosts.get(line.itemId) ?? 0)
              : line.itemType === "PACKAGE"
                ? roundMoney(packageUsageCosts.get(line.itemId) ?? 0)
                : 0,
      }))
    );
    if (insErr) throw new Error(insErr.message);

    if (adjustment.additionalDue > 0 && payload.additionalPayment) {
      const payAmt = roundMoney(payload.additionalPayment.amount);
      if (payAmt > 0) {
        const { data: payRow, error: payErr } = await supabase
          .from("payments")
          .insert({
            organization_id: org.organizationId,
            sale_id: sale.id,
            amount: payAmt,
            method: payload.additionalPayment.method,
            reference: "SALE_AMEND_ADDITIONAL",
            created_by: userId,
          })
          .select("id")
          .single();
        if (payErr || !payRow) throw new Error(payErr?.message ?? "Additional payment failed");
        amendPaymentId = payRow.id;
      }
    }

    if (adjustment.refundDue > 0 && payload.refundPayment) {
      const { data: refundRow, error: refundErr } = await supabase
        .from("sale_refunds")
        .insert({
          organization_id: org.organizationId,
          sale_id: sale.id,
          amount: adjustment.refundDue,
          method: payload.refundPayment.method,
          reason: reason,
          reference: "SALE_AMEND_REFUND",
          created_by: userId,
        })
        .select("id")
        .single();
      if (refundErr || !refundRow) throw new Error(refundErr?.message ?? "Amend refund failed");
      amendRefundId = refundRow.id;

      // Cash leaving is tracked on sale_refunds. Ticket total already drops on amend,
      // so an expenses row would double-count against net profit.
    }

    const newVersion = currentVersion + 1;
    const additionalCollected =
      adjustment.additionalDue > 0 && payload.additionalPayment
        ? roundMoney(payload.additionalPayment.amount)
        : 0;
    const newPaymentTotal = roundMoney(paymentsTotal + additionalCollected);

    const { data: version, error: verErr } = await supabase
      .from("sale_versions")
      .insert({
        organization_id: org.organizationId,
        sale_id: sale.id,
        version_number: newVersion,
        customer_id: payload.customerId ?? null,
        appointment_id: payload.appointmentId ?? sale.appointment_id,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        deposit_applied: roundMoney(
          Math.min(Number(sale.deposit_applied ?? 0), totals.total)
        ),
        total: totals.total,
        payment_total: newPaymentTotal,
        status: "AMENDED",
        notes: payload.notes ?? sale.notes,
        change_reason: reason,
        changed_by: userId,
      })
      .select("id")
      .single();

    if (verErr || !version) throw new Error(verErr?.message ?? "Failed to create version");

    const { error: vItemsErr } = await supabase.from("sale_version_items").insert(
      totals.lines.map((line) => ({
        organization_id: org.organizationId,
        sale_version_id: version.id,
        item_type: line.itemType,
        item_id: line.itemId,
        name: line.name,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        line_total: line.lineTotal,
      }))
    );
    if (vItemsErr) throw new Error(vItemsErr.message);

    const oldDepositApplied = roundMoney(Number(sale.deposit_applied ?? 0));
    const newDepositApplied = roundMoney(Math.min(oldDepositApplied, totals.total));

    if (newDepositApplied < oldDepositApplied - 0.009) {
      // Excess advance was covering a higher ticket — free unused credit and shrink deposit payment
      await supabase
        .from("appointment_deposits")
        .update({ applied_to_sale_id: null })
        .eq("applied_to_sale_id", sale.id)
        .eq("organization_id", org.organizationId);

      const { data: depositPay } = await supabase
        .from("payments")
        .select("id")
        .eq("sale_id", sale.id)
        .eq("organization_id", org.organizationId)
        .eq("reference", "APPOINTMENT_DEPOSIT")
        .maybeSingle();

      if (newDepositApplied <= 0.009) {
        if (depositPay) {
          await supabase.from("payments").delete().eq("id", depositPay.id);
        }
      } else if (depositPay) {
        // payments.Update is intentionally empty in types — replace the row
        const { data: oldPay } = await supabase
          .from("payments")
          .select("sale_id, method, reference, notes, created_by, paid_at")
          .eq("id", depositPay.id)
          .maybeSingle();
        await supabase.from("payments").delete().eq("id", depositPay.id);
        if (oldPay) {
          await supabase.from("payments").insert({
            organization_id: org.organizationId,
            sale_id: oldPay.sale_id,
            amount: newDepositApplied,
            method: oldPay.method,
            reference: oldPay.reference,
            notes: oldPay.notes,
            created_by: oldPay.created_by,
            paid_at: oldPay.paid_at,
          });
        }
        // Re-apply deposits up to the reduced amount
        const apptId = payload.appointmentId ?? sale.appointment_id;
        if (apptId) {
          const { data: freeDeposits } = await supabase
            .from("appointment_deposits")
            .select("id, amount")
            .eq("organization_id", org.organizationId)
            .eq("appointment_id", apptId)
            .eq("status", "APPROVED")
            .is("applied_to_sale_id", null);
          let remaining = newDepositApplied;
          for (const dep of freeDeposits ?? []) {
            if (remaining <= 0) break;
            const depAmt = roundMoney(Number(dep.amount));
            const applyAmt = roundMoney(Math.min(remaining, depAmt));
            if (applyAmt <= 0) continue;
            if (applyAmt < depAmt) {
              const { data: shrunk, error: shrinkErr } = await supabase
                .from("appointment_deposits")
                .update({ amount: applyAmt, applied_to_sale_id: sale.id })
                .eq("id", dep.id)
                .eq("organization_id", org.organizationId)
                .is("applied_to_sale_id", null)
                .select("id");
              if (shrinkErr) throw new Error(shrinkErr.message);
              if (!shrunk?.length) {
                throw new Error("Deposit was already applied or could not be updated");
              }
              const leftover = roundMoney(depAmt - applyAmt);
              if (leftover > 0) {
                const { data: original } = await supabase
                  .from("appointment_deposits")
                  .select(
                    "appointment_id, method, notes, status, payment_reference, proof_path, approved_at, approved_by, paid_at, created_by"
                  )
                  .eq("id", dep.id)
                  .maybeSingle();
                if (!original) {
                  throw new Error(
                    "Deposit partially applied but original row could not be re-read; leftover was not created"
                  );
                }
                const { error: leftoverErr } = await supabase
                  .from("appointment_deposits")
                  .insert({
                    organization_id: org.organizationId,
                    appointment_id: original.appointment_id,
                    amount: leftover,
                    method: original.method,
                    notes: original.notes,
                    status: original.status,
                    payment_reference: original.payment_reference,
                    proof_path: original.proof_path,
                    approved_at: original.approved_at,
                    approved_by: original.approved_by,
                    applied_to_sale_id: null,
                    paid_at: original.paid_at,
                    created_by: original.created_by,
                  });
                if (leftoverErr) throw new Error(leftoverErr.message);
              }
            } else {
              const { data: applied, error: applyErr } = await supabase
                .from("appointment_deposits")
                .update({ applied_to_sale_id: sale.id })
                .eq("id", dep.id)
                .eq("organization_id", org.organizationId)
                .is("applied_to_sale_id", null)
                .select("id");
              if (applyErr) throw new Error(applyErr.message);
              if (!applied?.length) {
                throw new Error("Deposit was already applied or could not be updated");
              }
            }
            remaining = roundMoney(remaining - applyAmt);
          }
        }
      }
    }

    const { error: updErr } = await supabase
      .from("sales")
      .update({
        customer_id: payload.customerId ?? null,
        appointment_id: payload.appointmentId ?? sale.appointment_id,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        deposit_applied: newDepositApplied,
        total: totals.total,
        notes: payload.notes ?? sale.notes,
        status: "AMENDED",
        current_version: newVersion,
        last_amended_at: new Date().toISOString(),
        last_amended_by: userId,
      })
      .eq("id", sale.id)
      .eq("organization_id", org.organizationId)
      .eq("current_version", newVersion);

    if (updErr) throw new Error(updErr.message);

    await syncSalePaymentDenorm(org.organizationId, sale.id);

    await writeAuditLog({
      organizationId: org.organizationId,
      userId,
      action: "sale.amend",
      entityType: "sale",
      entityId: sale.id,
      metadata: {
        summary: `Amended v${currentVersion} → v${newVersion}${
          reason ? ` · ${reason}` : ""
        }`,
        fromVersion: currentVersion,
        toVersion: newVersion,
        oldTotal: Number(sale.total),
        newTotal: totals.total,
        reason,
        inventoryDeltas: deltas,
        paymentAdjustment: adjustment,
      },
    });

    revalidateSalePaths(sale.id);
    return { success: true, saleId: sale.id, version: newVersion };
  } catch (e) {
    // Best-effort compensation (no multi-statement DB txn via client)
    try {
      if (amendRefundId) {
        await supabase.from("sale_refunds").delete().eq("id", amendRefundId);
      }
      if (amendPaymentId) {
        await supabase.from("payments").delete().eq("id", amendPaymentId);
      }
      if (itemsReplaced && oldItemRows.length) {
        await supabase.from("sale_items").delete().eq("sale_id", sale.id);
        await supabase.from("sale_items").insert(oldItemRows);
      }
      // Roll version claim back so the invoice can be amended again
      await supabase
        .from("sales")
        .update({
          current_version: currentVersion,
          status: sale.status,
          total: Number(sale.total),
          subtotal: Number(sale.subtotal),
          discount: Number(sale.discount),
          tax: Number(sale.tax ?? 0),
          deposit_applied: Number(sale.deposit_applied ?? 0),
        })
        .eq("id", sale.id)
        .eq("organization_id", org.organizationId)
        .eq("current_version", currentVersion + 1);
      try {
        await syncSalePaymentDenorm(org.organizationId, sale.id);
      } catch {
        /* ignore */
      }
    } catch {
      /* surfaced via original error */
    }
    if (usageDeltasApplied.length) {
      try {
        for (const { productId, delta } of usageDeltasApplied) {
          if (Math.abs(delta) < 0.0005) continue;
          // Negate the amend movement
          const type = delta > 0 ? "IN" : "OUT";
          const quantity = roundQty(Math.abs(delta));
          await supabase.from("inventory_transactions").insert({
            organization_id: org.organizationId,
            product_id: productId,
            type,
            quantity,
            reference_type:
              type === "IN" ? "service_usage_amend_reverse" : "service_usage_amend",
            reference_id: sale.id,
            notes: "Amendment rollback — in-house usage",
            created_by: userId,
          });
        }
      } catch {
        /* surfaced via original error */
      }
    }
    if (inventoryApplied && deltas.length) {
      try {
        await applyInventoryDeltas(
          org.organizationId,
          sale.id,
          deltas.map((d) => ({ productId: d.productId, delta: -d.delta })),
          userId
        );
      } catch {
        /* surfaced via original error */
      }
    }
    return { error: e instanceof Error ? e.message : "Amendment failed" };
  }
}

export async function refundSale(input: {
  saleId: string;
  amount: number;
  method: "CASH" | "CARD" | "OTHER";
  reason: string;
}): Promise<ActionResult> {
  const org = await requireAction("sales.refund");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reason = input.reason?.trim() ?? "";
  if (reason.length < 3) return { error: "Refund reason is required" };
  const amount = Math.round((Number(input.amount) || 0) * 100) / 100;
  if (amount <= 0) return { error: "Refund amount must be greater than zero" };

  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", input.saleId)
    .eq("organization_id", org.organizationId)
    .single();

  if (!sale) return { error: "Sale not found" };
  if (!isPostedSaleStatus(sale.status) && sale.status !== "REFUNDED") {
    return { error: "Cannot refund this sale status" };
  }

  const cashPayments = await sumRefundablePayments(sale.id, org.organizationId);
  const allPayments = await sumPayments(sale.id, org.organizationId);
  const refundsTotal = await sumRefunds(sale.id, org.organizationId);
  const refundable = Math.round((cashPayments - refundsTotal) * 100) / 100;
  if (amount > refundable + 0.009) {
    return { error: `Refund exceeds refundable cash/card collected (max ${refundable})` };
  }

  const newRefunds = refundsTotal + amount;
  // Due math must include deposit applications; cash cap uses cashPayments only.
  const liveState = computeSalePaymentState({
    total: Number(sale.total),
    paymentsSum: allPayments,
    refundsSum: refundsTotal,
    saleStatus: sale.status,
  });
  // Only fully refund when all cash is returned AND nothing is still owed (live math).
  const fullyRefunded =
    newRefunds >= cashPayments - 0.009 && liveState.amountDue <= 0.009;

  // Full refund: restore retail stock BEFORE inserting the refund row so we never
  // leave money refunded with stock still out (or refund committed with no restore).
  let restoredRetail: { productId: string; quantity: number }[] = [];
  if (fullyRefunded) {
    const { data: items } = await supabase
      .from("sale_items")
      .select("item_type, item_id, quantity")
      .eq("sale_id", sale.id);
    try {
      restoredRetail = await reverseAllProductStock(
        org.organizationId,
        sale.id,
        items ?? [],
        user?.id ?? null,
        "sale_refund_full"
      );
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Inventory restore failed" };
    }
  }

  const { data: refundRow, error: refundErr } = await supabase
    .from("sale_refunds")
    .insert({
      organization_id: org.organizationId,
      sale_id: sale.id,
      amount,
      method: input.method,
      reason,
      reference: fullyRefunded ? "SALE_FULL_REFUND" : null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (refundErr || !refundRow) {
    if (restoredRetail.length) {
      try {
        await compensateRetailRestore(
          org.organizationId,
          sale.id,
          restoredRetail,
          user?.id ?? null
        );
      } catch (compErr) {
        return {
          error:
            (refundErr?.message ?? "Refund insert failed") +
            " · " +
            (compErr instanceof Error ? compErr.message : "Stock compensate failed"),
        };
      }
    }
    return { error: refundErr?.message ?? "Refund insert failed" };
  }

  // Track cash-out on sale_refunds only. Full refunds remove the sale from revenue;
  // partial refunds are subtracted in financial summary via sale_refunds on posted sales.
  // An expenses row here would double-hit P&L.

  if (fullyRefunded) {
    // Unlink advances so they can be reused or refunded (same as void)
    await supabase
      .from("appointment_deposits")
      .update({ applied_to_sale_id: null })
      .eq("applied_to_sale_id", sale.id)
      .eq("organization_id", org.organizationId);

    const { error: statusErr } = await supabase
      .from("sales")
      .update({ status: "REFUNDED" })
      .eq("id", sale.id)
      .eq("organization_id", org.organizationId);

    if (statusErr) {
      // Money + stock already applied; surface error but do not compensate stock
      // (refund row exists — owner can reconcile status). Prefer stock+money correct.
      try {
        await syncSalePaymentDenorm(org.organizationId, sale.id);
      } catch {
        /* ignore */
      }
      return {
        error: `Refund saved and retail stock restored, but status update failed: ${statusErr.message}. Refresh and check invoice.`,
      };
    }
  }

  try {
    await syncSalePaymentDenorm(org.organizationId, sale.id);
  } catch (e) {
    return {
      error:
        (e instanceof Error ? e.message : "Failed to sync payment status") +
        (fullyRefunded
          ? " (refund and retail restore already applied — refresh invoice)"
          : ""),
    };
  }

  await writeAuditLog({
    organizationId: org.organizationId,
    userId: user?.id,
    action: "sale.refund",
    entityType: "sale",
    entityId: sale.id,
    metadata: {
      amount,
      method: input.method,
      reason,
      fullyRefunded,
      stockRestoredRetail: fullyRefunded,
      inHouseKeptDeducted: true,
      refundId: refundRow.id,
    },
  });

  revalidateSalePaths(sale.id);
  return {
    success: true,
    message: fullyRefunded
      ? "Full refund recorded. Retail stock restored. In-house usage kept deducted (already used)."
      : "Partial refund recorded. Money only — retail and in-house stock unchanged.",
  };
}

export async function getSaleVersions(saleId: string) {
  const org = await requireAction("sales.edit");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sale_versions")
    .select("*, items:sale_version_items(*)")
    .eq("sale_id", saleId)
    .eq("organization_id", org.organizationId)
    .order("version_number", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSaleRefunds(saleId: string) {
  const org = await requireAction("sales.refund");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sale_refunds")
    .select("*")
    .eq("sale_id", saleId)
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
