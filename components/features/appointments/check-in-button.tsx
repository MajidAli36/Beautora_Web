"use client";

import { useTransition } from "react";
import { checkInAppointment } from "@/lib/actions/appointments";
import { getTokenReceiptHtml } from "@/lib/actions/print";
import { printThermalHtml } from "@/lib/print/browser";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";

type CheckInButtonProps = {
  appointmentId: string;
  customerName?: string;
  customerPhone?: string | null;
};

export function CheckInButton({
  appointmentId,
  customerName,
  customerPhone,
}: CheckInButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await checkInAppointment(appointmentId);
          if (result.error) {
            notify.error(result.error);
            return;
          }
          notify.success(
            result.tokenNumber
              ? `Checked in · token #${result.tokenNumber}`
              : "Checked in."
          );
          if (result.tokenNumber) {
            const html = await getTokenReceiptHtml({
              tokenNumber: result.tokenNumber,
              customerName: customerName ?? "Customer",
              customerPhone,
            });
            printThermalHtml(html);
          }
        })
      }
    >
      {pending ? "…" : "Check in + Token"}
    </Button>
  );
}
