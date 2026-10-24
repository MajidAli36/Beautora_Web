"use client";

import { useActionState } from "react";
import { createStaffPayment } from "@/lib/actions/payroll";
import { useActionToast } from "@/hooks/use-action-toast";
import { STAFF_PAYMENT_TYPE_LABELS, type StaffPaymentType } from "@/lib/finances/categories";
import { getLocalDateString } from "@/lib/dates/local";
import type { ActionResult } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const QUICK_TYPES: StaffPaymentType[] = ["BONUS", "ADVANCE", "SALARY", "PARTIAL"];

export function StaffQuickPayForm({
  staffId,
  staffName,
  yearMonth,
}: {
  staffId: string;
  staffName: string;
  yearMonth: string;
}) {
  const [state, formAction, pending] = useActionState(createStaffPayment, {} as ActionResult);
  useActionToast(state, { successMessage: "Payment recorded — staff can see it on their invoice." });
  const today = getLocalDateString();
  const periodStart = `${yearMonth}-01`;
  const [y, m] = yearMonth.split("-").map(Number);
  const periodEnd = `${yearMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="staff_id" value={staffId} />
      <input type="hidden" name="period_start" value={periodStart} />
      <input type="hidden" name="period_end" value={periodEnd} />
      <input type="hidden" name="payment_method" value="CASH" />

      <div className="sm:col-span-2 text-sm text-muted-foreground">
        Give <span className="font-medium text-foreground">{staffName}</span> a bonus, advance,
        salary, or partial payment. It appears on their salary invoice immediately.
      </div>

      <div className="space-y-2">
        <Label htmlFor="qp_payment_type">Type *</Label>
        <select
          id="qp_payment_type"
          name="payment_type"
          required
          defaultValue="BONUS"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {QUICK_TYPES.map((t) => (
            <option key={t} value={t}>
              {STAFF_PAYMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="qp_amount">Amount *</Label>
        <Input
          id="qp_amount"
          name="amount"
          type="number"
          min={1}
          step="0.01"
          required
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="qp_payment_date">Date *</Label>
        <Input
          id="qp_payment_date"
          name="payment_date"
          type="date"
          required
          defaultValue={today}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="qp_notes">Note (optional)</Label>
        <Textarea
          id="qp_notes"
          name="notes"
          rows={2}
          placeholder="e.g. Performance bonus for March"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Record bonus / payment"}
        </Button>
      </div>
    </form>
  );
}
