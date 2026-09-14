"use client";

import { useTransition } from "react";
import { getSaleReceiptHtml } from "@/lib/actions/print";
import { printThermalHtml } from "@/lib/print/browser";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export function PrintReceiptButton({ saleId }: { saleId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const html = await getSaleReceiptHtml(saleId);
          if (!html) {
            notify.error("Could not load receipt.");
            return;
          }
          printThermalHtml(html);
          notify.success("Receipt sent to printer.");
        })
      }
    >
      {pending ? "Preparing…" : "Print invoice"}
    </Button>
  );
}

export function printSaleReceipt(saleId: string): Promise<void> {
  return getSaleReceiptHtml(saleId).then((html) => {
    if (html) printThermalHtml(html);
  });
}
