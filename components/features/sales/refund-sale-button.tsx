"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Undo2 } from "lucide-react";
import { refundSale } from "@/lib/actions/sales-lifecycle";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function RefundSaleButton({
  saleId,
  refundableMax,
  variant = "outline",
  size = "default",
}: {
  saleId: string;
  refundableMax: number;
  variant?: "outline" | "default" | "secondary";
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(String(refundableMax));
  const [pending, startTransition] = useTransition();

  const amount = Number(refundAmount) || 0;
  const isFull = useMemo(
    () => refundableMax > 0 && amount >= refundableMax - 0.009,
    [amount, refundableMax]
  );

  if (refundableMax <= 0) return null;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className="gap-1.5"
        onClick={() => {
          setReason("");
          setRefundAmount(String(refundableMax));
          setOpen(true);
        }}
      >
        <Undo2 className="size-3.5" />
        Refund
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Max refundable (cash/card collected):{" "}
              <strong className="text-foreground">{formatCurrency(refundableMax)}</strong>
            </p>
            <div
              className={
                isFull
                  ? "rounded-lg border border-teal-200 bg-teal-50/80 px-3 py-2 text-teal-900 dark:border-teal-900/50 dark:bg-teal-950/30 dark:text-teal-100"
                  : "rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100"
              }
            >
              {isFull ? (
                <p>
                  <strong>Full refund</strong> — restores retail stock only. In-house cream/ml stays
                  deducted (already used on the client). Marks invoice REFUNDED.
                </p>
              ) : (
                <p>
                  <strong>Partial refund</strong> — money only. Retail and in-house stock stay
                  deducted.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`refund-amt-${saleId}`}>Amount</Label>
              <Input
                id={`refund-amt-${saleId}`}
                type="number"
                min={0}
                max={refundableMax}
                step="1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`refund-reason-${saleId}`}>Reason</Label>
              <Textarea
                id={`refund-reason-${saleId}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Refund reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await refundSale({
                    saleId,
                    amount,
                    method: "CASH",
                    reason,
                  });
                  if (res.error) {
                    notify.error(res.error);
                    return;
                  }
                  notify.success(res.message ?? "Refund recorded.");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Refunding…" : isFull ? "Confirm full refund" : "Confirm partial refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
