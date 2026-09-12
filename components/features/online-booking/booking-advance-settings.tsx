"use client";

import { useActionState } from "react";
import { saveBookingAdvanceSettings } from "@/lib/actions/appointments";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ActionResult } from "@/types/commerce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  settings: {
    booking_advance_amount: number;
    booking_advance_percent: number;
    booking_payment_instructions: string | null;
  } | null;
};

export function BookingAdvanceSettings({ settings }: Props) {
  const [state, formAction, pending] = useActionState(saveBookingAdvanceSettings, {} as ActionResult);
  useActionToast(state, { successMessage: "Settings saved." });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Online advance payment</CardTitle>
        <CardDescription>
          Applies only to the public online booking page — not in-house appointments, POS, or
          walk-ins. Set how much guests must pay up front online: fixed amount <em>or</em> a percent
          of selected services (fixed wins if both are filled). Leave both at 0 for no advance.
          Staff approve the payment screenshot before the online booking is confirmed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="booking_advance_amount">Fixed advance</Label>
            <Input
              id="booking_advance_amount"
              name="booking_advance_amount"
              type="number"
              min={0}
              step={1}
              defaultValue={settings?.booking_advance_amount ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              Shown as-is on the booking page (e.g. 500 → Rs 500).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking_advance_percent">Or % of services</Label>
            <Input
              id="booking_advance_percent"
              name="booking_advance_percent"
              type="number"
              min={0}
              max={100}
              defaultValue={settings?.booking_advance_percent ?? 0}
            />
            <p className="text-xs text-muted-foreground">
              Used only when fixed advance is 0. Ignored if fixed is set.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="booking_payment_instructions">
              Extra payment notes (optional)
            </Label>
            <Textarea
              id="booking_payment_instructions"
              name="booking_payment_instructions"
              rows={3}
              placeholder="Any extra note shown with your payment accounts"
              defaultValue={settings?.booking_payment_instructions ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              JazzCash / bank numbers are managed under{" "}
              <a href="/settings" className="underline underline-offset-2">
                Settings → Payment accounts
              </a>
              .
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save advance settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
