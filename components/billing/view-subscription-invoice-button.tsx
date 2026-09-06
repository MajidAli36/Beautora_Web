"use client";

import { useTransition } from "react";
import { FileImage, Loader2 } from "lucide-react";
import { getSubscriptionInvoiceUrl } from "@/lib/actions/billing";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export function ViewSubscriptionInvoiceButton({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await getSubscriptionInvoiceUrl(paymentId);
          if (result.error || !result.url) {
            notify.error(result.error ?? "Could not open invoice");
            return;
          }
          window.open(result.url, "_blank", "noopener,noreferrer");
        });
      }}
    >
      {pending ? (
        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
      ) : (
        <FileImage className="mr-1.5 size-3.5" />
      )}
      View invoice
    </Button>
  );
}
