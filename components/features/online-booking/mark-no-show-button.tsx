"use client";

import { useTransition } from "react";
import { markAppointmentNoShow } from "@/lib/actions/appointments";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";

type MarkNoShowButtonProps = {
  appointmentId: string;
  onMarked?: (appointmentId: string) => void;
};

export function MarkNoShowButton({ appointmentId, onMarked }: MarkNoShowButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Mark as no-show? Customer booked but did not come. This moves the appointment to History."
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await markAppointmentNoShow(appointmentId);
          if (result.error) {
            notify.error(result.error);
            return;
          }
          notify.success("Marked as no-show — saved in History.");
          onMarked?.(appointmentId);
        });
      }}
    >
      {pending ? "Saving…" : "No-show"}
    </Button>
  );
}
