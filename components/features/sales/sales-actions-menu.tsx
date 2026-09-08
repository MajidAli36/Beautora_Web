"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Eye,
  Pencil,
  Printer,
  MoreHorizontal,
  History,
  Ban,
  Undo2,
  Banknote,
} from "lucide-react";
import { printSaleReceipt } from "@/components/features/sales/print-receipt-button";
import { voidSale } from "@/lib/actions/sales";
import { refundSale } from "@/lib/actions/sales-lifecycle";
import { notify } from "@/lib/toast";
import { formatCurrency } from "@/lib/format";
import { isDeletedSaleStatus, isPostedSaleStatus } from "@/lib/sales/lifecycle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

type SalesActionsMenuProps = {
  saleId: string;
  status: string;
  total: number;
  amountDue?: number;
  refundableMax?: number;
  paymentVersion?: number;
  invoiceLabel?: string;
  canManage: boolean;
  canReceivePayment?: boolean;
  onReceivePayment?: () => void;
};

export function SalesActionsMenu({
  saleId,
  status,
  total,
  amountDue = 0,
  refundableMax,
  canManage,
  canReceivePayment = false,
  onReceivePayment,
}: SalesActionsMenuProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState("");
  const maxRefund = Math.max(0, Number(refundableMax ?? total) || 0);
  const [refundAmount, setRefundAmount] = useState(String(maxRefund));

  const deleted = isDeletedSaleStatus(status);
  const posted = isPostedSaleStatus(status);
  const showReceive = canReceivePayment && amountDue > 0 && posted && !deleted;
  const canRefund = canManage && posted && !deleted && maxRefund > 0;

  const amount = Number(refundAmount) || 0;
  const isFull = useMemo(
    () => maxRefund > 0 && amount >= maxRefund - 0.009,
    [amount, maxRefund]
  );

  return (
    <>
      <div className="flex justify-end gap-1">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          render={<Link href={`/sales/${saleId}`} />}
        >
          <Eye className="size-3.5" />
          View
        </Button>
        {showReceive && onReceivePayment ? (
          <Button variant="outline" size="sm" className="gap-1" onClick={onReceivePayment}>
            <Banknote className="size-3.5" />
            Pay
          </Button>
        ) : null}
        {canManage && posted && !deleted ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            render={<Link href={`/sales/${saleId}/edit`} />}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2 text-sm outline-none hover:bg-muted disabled:opacity-50"
            aria-label="More actions"
            disabled={deleted && !canManage}
          >
            <MoreHorizontal className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {showReceive && onReceivePayment ? (
              <DropdownMenuItem onClick={onReceivePayment}>
                <Banknote className="size-3.5" />
                Receive payment
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={() => {
                void printSaleReceipt(saleId);
              }}
            >
              <Printer className="size-3.5" />
              Print invoice
            </DropdownMenuItem>
            {canManage ? (
              <DropdownMenuItem onClick={() => router.push(`/sales/${saleId}?tab=history`)}>
                <History className="size-3.5" />
                Invoice history
              </DropdownMenuItem>
            ) : null}
            {canRefund || (canManage && posted && !deleted) ? (
              <>
                <DropdownMenuSeparator />
                {canRefund ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setReason("");
                      setRefundAmount(String(maxRefund));
                      setRefundOpen(true);
                    }}
                  >
                    <Undo2 className="size-3.5" />
                    Refund
                  </DropdownMenuItem>
                ) : null}
                {canManage && posted && !deleted ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setReason("");
                      setVoidOpen(true);
                    }}
                  >
                    <Ban className="size-3.5" />
                    Delete invoice
                  </DropdownMenuItem>
                ) : null}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Soft-deletes this invoice (stays visible as Deleted / Disabled). Restores{" "}
            <strong className="text-foreground">retail</strong> product stock. In-house cream/ml
            stays deducted (already used). Removed from revenue; payment history kept.
          </p>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this invoice being deleted?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await voidSale(saleId, reason);
                  if (res.error) {
                    notify.error(res.error);
                    return;
                  }
                  notify.success("Invoice deleted — retail stock restored; in-house kept deducted");
                  setVoidOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting…" : "Delete invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refund</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Max refundable:{" "}
              <strong className="text-foreground">{formatCurrency(maxRefund)}</strong>
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
                  <strong>Full refund</strong> — restores retail stock only. In-house usage stays
                  deducted (already used). Marks invoice REFUNDED.
                </p>
              ) : (
                <p>
                  <strong>Partial refund</strong> — money only; retail and in-house stock stay
                  deducted.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                min={0}
                max={maxRefund}
                step="1"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-reason">Reason</Label>
              <Textarea
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Refund reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={pending}>
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
                  setRefundOpen(false);
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
