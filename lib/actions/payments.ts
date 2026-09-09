"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { requireAction } from "@/lib/auth/permissions";
import { requireOrganization } from "@/lib/auth/organization";
import { createClient } from "@/lib/supabase/server";
import { roundMoney } from "@/lib/sales/calculate";
import {
  allocateAccountPayment,
  validateReceivePayment,
  type DueInvoice,
} from "@/lib/sales/payment-balance";
import { syncSalePaymentDenorm } from "@/lib/sales/sync-payment-denorm";
import { endOfLocalDay, startOfLocalDay } from "@/lib/dates/local";
import type { ActionResult, PaymentMethod } from "@/types/commerce";

function revalidatePaymentPaths(saleId: string, customerId?: string | null) {
  revalidatePath("/sales");
  revalidatePath(`/sales/${saleId}`);
  revalidatePath("/reports");
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
    revalidatePath(`/customers/${customerId}/statement`);
  }
}

export async function receiveSalePayment(input: {
  saleId: string;
  amount: number;
  method: PaymentMethod;
  expectedPaymentVersion: number;
  tenderedAmount?: number | null;
  reference?: string | null;
  notes?: string | null;
}): Promise<ActionResult & { changeGiven?: number; amountDue?: number }> {
  const org = await requireAction("pos.sell");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sale, error: saleErr } = await supabase
    .from("sales")
    .select(
      "id, status, total, customer_id, payment_version, amount_paid, amount_refunded, amount_due"
    )
    .eq("id", input.saleId)
    .eq("organization_id", org.organizationId)
    .single();

  if (saleErr || !sale) return { error: saleErr?.message ?? "Sale not found" };

  const [{ data: pays }, { data: refs }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount")
      .eq("sale_id", sale.id)
      .eq("organization_id", org.organizationId),
    supabase
      .from("sale_refunds")
      .select("amount")
      .eq("sale_id", sale.id)
      .eq("organization_id", org.organizationId),
  ]);

  const paymentsSum = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const refundsSum = (refs ?? []).reduce((s, p) => s + Number(p.amount), 0);

  const check = validateReceivePayment({
    saleStatus: sale.status,
    customerId: sale.customer_id,
    total: Number(sale.total),
    paymentsSum,
    refundsSum,
    paymentAmount: input.amount,
    tenderedAmount: input.tenderedAmount,
    expectedPaymentVersion: input.expectedPaymentVersion,
    currentPaymentVersion: Number(sale.payment_version ?? 1),
  });

  if (!check.ok) return { error: check.error };

  const { error: payErr } = await supabase.from("payments").insert({
    organization_id: org.organizationId,
    sale_id: sale.id,
    amount: check.appliedAmount,
    method: input.method,
    reference: input.reference ?? "RECEIVE_PAYMENT",
    notes: input.notes ?? null,
    created_by: user?.id ?? null,
    tendered_amount:
      input.method === "CASH"
        ? roundMoney(input.tenderedAmount ?? check.appliedAmount)
        : null,
    change_given: input.method === "CASH" ? check.changeGiven : null,
  });
  if (payErr) return { error: payErr.message };

  let state;
  try {
    state = await syncSalePaymentDenorm(org.organizationId, sale.id);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update invoice balance" };
  }

  await writeAuditLog({
    organizationId: org.organizationId,
    userId: user?.id,
    action: "payment.created",
    entityType: "sale",
    entityId: sale.id,
    metadata: {
      amount: check.appliedAmount,
      method: input.method,
      changeGiven: check.changeGiven,
      amountDue: state.amountDue,
      paymentStatus: state.paymentStatus,
    },
  });

  revalidatePaymentPaths(sale.id, sale.customer_id);
  return {
    success: true,
    changeGiven: check.changeGiven,
    amountDue: state.amountDue,
  };
}

export async function previewCustomerAccountPayment(
  customerId: string,
  amount: number
) {
  await requireAction("pos.sell");
  const dues = await getCustomerDueInvoices(customerId);
  const lines = allocateAccountPayment(
    dues.map((d) => ({
      saleId: d.saleId,
      invoiceNumber: d.invoiceNumber,
      total: d.total,
      amountDue: d.amountDue,
      completedAt: d.completedAt,
    })),
    amount
  );
  const applied = roundMoney(lines.reduce((s, l) => s + l.amount, 0));
  return {
    outstanding: roundMoney(dues.reduce((s, d) => s + d.amountDue, 0)),
    paymentAmount: roundMoney(amount),
    applied,
    unallocated: roundMoney(Math.max(0, roundMoney(amount) - applied)),
    allocations: lines.map((l) => {
      const inv = dues.find((d) => d.saleId === l.saleId);
      return {
        ...l,
        invoiceNumber: inv?.invoiceNumber ?? null,
        expectedPaymentVersion: inv?.paymentVersion ?? 1,
      };
    }),
  };
}

export async function receiveCustomerAccountPayment(input: {
  customerId: string;
  amount: number;
  method: PaymentMethod;
  allocations: { saleId: string; amount: number; expectedPaymentVersion: number }[];
  notes?: string | null;
}): Promise<ActionResult> {
  const org = await requireAction("pos.sell");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const amount = roundMoney(input.amount);
  if (!(amount > 0)) return { error: "Payment amount must be greater than zero" };
  if (!input.allocations?.length) {
    return { error: "Confirm payment allocation before submitting" };
  }

  const allocated = roundMoney(
    input.allocations.reduce((s, a) => s + roundMoney(a.amount), 0)
  );
  if (Math.abs(allocated - amount) > 0.009) {
    return { error: "Allocation total must match payment amount" };
  }

  for (const line of input.allocations) {
    const result = await receiveSalePayment({
      saleId: line.saleId,
      amount: line.amount,
      method: input.method,
      expectedPaymentVersion: line.expectedPaymentVersion,
      notes: input.notes ?? "Account payment allocation",
      reference: "ACCOUNT_PAYMENT",
    });
    if (result.error) return { error: result.error };
  }

  await writeAuditLog({
    organizationId: org.organizationId,
    userId: user?.id,
    action: "payment.allocated",
    entityType: "customer",
    entityId: input.customerId,
    metadata: {
      amount,
      method: input.method,
      allocations: input.allocations,
    },
  });

  revalidatePath(`/customers/${input.customerId}`);
  revalidatePath("/customers");
  revalidatePath("/sales");
  revalidatePath("/reports");
  return { success: true };
}

export async function getCustomerDueInvoices(customerId: string) {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .select(
      `
      id, total, amount_due, amount_paid, payment_status, payment_version,
      completed_at, status,
      invoice:invoices(invoice_number)
    `
    )
    .eq("organization_id", org.organizationId)
    .eq("customer_id", customerId)
    .in("status", ["COMPLETED", "AMENDED"])
    .is("deleted_at", null)
    .gt("amount_due", 0)
    .order("completed_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((s) => {
    const inv = Array.isArray(s.invoice) ? s.invoice[0] : s.invoice;
    return {
      saleId: s.id,
      invoiceNumber: inv?.invoice_number ?? null,
      total: Number(s.total),
      amountDue: Number(s.amount_due),
      amountPaid: Number(s.amount_paid),
      paymentStatus: s.payment_status,
      paymentVersion: Number(s.payment_version ?? 1),
      completedAt: s.completed_at as string | null,
      status: s.status,
    };
  });
}

export type PriorDuePaymentInput = {
  saleId: string;
  amount: number;
  expectedPaymentVersion: number;
};

/** Validate past-due lines before creating a new POS sale (no writes). */
export async function validatePriorDuePayments(
  customerId: string,
  lines: PriorDuePaymentInput[]
): Promise<ActionResult> {
  if (!lines.length) return { success: true };
  if (!customerId) return { error: "Select a customer to pay past dues" };

  const org = await requireAction("pos.sell");
  const supabase = await createClient();
  const saleIds = [...new Set(lines.map((l) => l.saleId))];

  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, customer_id, amount_due, payment_version, status, deleted_at")
    .eq("organization_id", org.organizationId)
    .in("id", saleIds);

  if (error) return { error: error.message };

  const byId = new Map((sales ?? []).map((s) => [s.id, s]));

  for (const line of lines) {
    const amount = roundMoney(line.amount);
    if (!(amount > 0)) return { error: "Past due payment amount must be greater than zero" };

    const sale = byId.get(line.saleId);
    if (!sale || sale.deleted_at) return { error: "A selected past invoice was not found" };
    if (sale.customer_id !== customerId) {
      return { error: "A selected past invoice does not belong to this customer" };
    }
    if (sale.status !== "COMPLETED" && sale.status !== "AMENDED") {
      return { error: "A selected past invoice cannot accept payment" };
    }

    const due = roundMoney(Number(sale.amount_due));
    if (Math.abs(amount - due) > 0.009) {
      return {
        error: `Past due for an invoice changed (expected ${due}). Uncheck and reload, then try again.`,
      };
    }
    if (Number(sale.payment_version ?? 1) !== line.expectedPaymentVersion) {
      return {
        error: "A past invoice was updated elsewhere. Reload dues and try again.",
      };
    }
  }

  return { success: true };
}

/** Apply full settlements for POS-selected past invoices. */
export async function applyPriorDuePayments(input: {
  customerId: string;
  method: PaymentMethod;
  lines: PriorDuePaymentInput[];
}): Promise<ActionResult> {
  if (!input.lines.length) return { success: true };

  const check = await validatePriorDuePayments(input.customerId, input.lines);
  if (check.error) return check;

  for (const line of input.lines) {
    const result = await receiveSalePayment({
      saleId: line.saleId,
      amount: roundMoney(line.amount),
      method: input.method,
      expectedPaymentVersion: line.expectedPaymentVersion,
      notes: "Past due paid at POS",
      reference: "POS_PRIOR_DUE",
    });
    if (result.error) {
      return {
        error: `New sale saved, but past due payment failed: ${result.error}. Collect remaining dues from Sales or customer account.`,
      };
    }
  }

  return { success: true };
}

export async function getCustomerFinancialSummary(customerId: string) {
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data: sales, error } = await supabase
    .from("sales")
    .select("id, total, discount, amount_paid, amount_refunded, amount_due, status")
    .eq("organization_id", org.organizationId)
    .eq("customer_id", customerId)
    .in("status", ["COMPLETED", "AMENDED", "REFUNDED"])
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const posted = (sales ?? []).filter(
    (s) => s.status === "COMPLETED" || s.status === "AMENDED"
  );
  const totalPurchases = posted.reduce((s, r) => s + Number(r.total), 0);
  // Net cash/credit applied on open invoices (paid minus refunds)
  const totalPaid = posted.reduce(
    (s, r) => s + Number(r.amount_paid) - Number(r.amount_refunded),
    0
  );
  const totalRefunds = (sales ?? []).reduce((s, r) => s + Number(r.amount_refunded), 0);
  const outstandingDue = posted.reduce((s, r) => s + Number(r.amount_due), 0);
  const totalDiscounts = posted.reduce((s, r) => s + Number(r.discount), 0);

  return {
    totalPurchases: roundMoney(totalPurchases),
    totalPaid: roundMoney(totalPaid),
    outstandingDue: roundMoney(outstandingDue),
    totalRefunds: roundMoney(totalRefunds),
    totalDiscounts: roundMoney(totalDiscounts),
    dueInvoiceCount: posted.filter((s) => Number(s.amount_due) > 0).length,
  };
}

export type StatementLine = {
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export async function getCustomerStatement(
  customerId: string,
  from?: string,
  to?: string
): Promise<{ lines: StatementLine[]; openingBalance: number; closingBalance: number }> {
  await requireAction("reports.view");
  const org = await requireOrganization();
  const supabase = await createClient();

  const { data: sales } = await supabase
    .from("sales")
    .select(
      `
      id, total, status, completed_at, created_at, amount_due,
      invoice:invoices(invoice_number)
    `
    )
    .eq("organization_id", org.organizationId)
    .eq("customer_id", customerId)
    .in("status", ["COMPLETED", "AMENDED", "VOID", "REFUNDED"])
    .is("deleted_at", null)
    .order("completed_at", { ascending: true });

  const saleIds = (sales ?? []).map((s) => s.id);
  const [{ data: refunds }, { data: payments }] = await Promise.all([
    saleIds.length
      ? supabase
          .from("sale_refunds")
          .select("sale_id, amount, created_at, reason")
          .eq("organization_id", org.organizationId)
          .in("sale_id", saleIds)
      : Promise.resolve({ data: [] as { sale_id: string; amount: number; created_at: string; reason: string }[] }),
    saleIds.length
      ? supabase
          .from("payments")
          .select("sale_id, amount, method, paid_at, reference")
          .eq("organization_id", org.organizationId)
          .in("sale_id", saleIds)
      : Promise.resolve({
          data: [] as {
            sale_id: string;
            amount: number;
            method: string;
            paid_at: string;
            reference: string | null;
          }[],
        }),
  ]);

  const refundsBySale = new Map<string, NonNullable<typeof refunds>>();
  for (const r of refunds ?? []) {
    const list = refundsBySale.get(r.sale_id) ?? [];
    list.push(r);
    refundsBySale.set(r.sale_id, list);
  }
  const paymentsBySale = new Map<
    string,
    {
      sale_id: string;
      amount: number;
      method: string;
      paid_at: string;
      reference: string | null;
    }[]
  >();
  for (const p of payments ?? []) {
    const list = paymentsBySale.get(p.sale_id) ?? [];
    list.push(p);
    paymentsBySale.set(p.sale_id, list);
  }

  type Event = {
    date: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
  };
  const events: Event[] = [];

  for (const sale of sales ?? []) {
    const inv = Array.isArray(sale.invoice) ? sale.invoice[0] : sale.invoice;
    const invNo = inv?.invoice_number ?? sale.id.slice(0, 8);
    const saleDate = sale.completed_at ?? sale.created_at;
    if (sale.status === "COMPLETED" || sale.status === "AMENDED") {
      events.push({
        date: saleDate,
        reference: invNo,
        description: "Sale",
        debit: Number(sale.total),
        credit: 0,
      });
    }
    for (const p of paymentsBySale.get(sale.id) ?? []) {
      events.push({
        date: p.paid_at,
        reference: p.reference ?? "PAY",
        description: `Payment (${p.method})`,
        debit: 0,
        credit: Number(p.amount),
      });
    }
    for (const r of refundsBySale.get(sale.id) ?? []) {
      events.push({
        date: r.created_at,
        reference: invNo,
        description: `Refund — ${r.reason}`,
        debit: Number(r.amount),
        credit: 0,
      });
    }
  }

  events.sort((a, b) => a.date.localeCompare(b.date));

  const fromTs = from ? startOfLocalDay(from).getTime() : null;
  const toTs = to ? endOfLocalDay(to).getTime() : null;

  let balance = 0;
  let openingBalance = 0;
  const lines: StatementLine[] = [];

  for (const ev of events) {
    const t = new Date(ev.date).getTime();
    const beforeRange = fromTs != null && t < fromTs;
    const afterRange = toTs != null && t > toTs;
    balance = roundMoney(balance + ev.debit - ev.credit);
    if (beforeRange) {
      openingBalance = balance;
      continue;
    }
    if (afterRange) continue;
    lines.push({
      date: ev.date,
      reference: ev.reference,
      description: ev.description,
      debit: ev.debit,
      credit: ev.credit,
      balance,
    });
  }

  return {
    lines,
    openingBalance: roundMoney(openingBalance),
    closingBalance: lines.length
      ? lines[lines.length - 1].balance
      : roundMoney(openingBalance),
  };
}

export type { DueInvoice };
