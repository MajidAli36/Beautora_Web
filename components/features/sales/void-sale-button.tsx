"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "@/lib/actions/sales";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VoidSaleButton({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete invoice
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this invoice?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Soft-deletes the invoice (visible as Deleted / Disabled). Restores retail stock.
            In-house cream/ml stays deducted (already used). Excluded from revenue. Owner can open
            History for money and stock timeline.
          </p>
          <div className="space-y-2">
            <Label htmlFor="void-reason-btn">Reason</Label>
            <Textarea
              id="void-reason-btn"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this invoice being deleted?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
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
                  notify.success(
                    "Invoice deleted — retail restored; in-house kept deducted"
                  );
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting…" : "Delete invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
