"use client";

import { useActionState } from "react";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/actions/customers";
import type { Customer } from "@/types";

type CustomerFormProps = {
  action: (
    prev: ActionResult,
    formData: FormData
  ) => Promise<ActionResult>;
  customer?: Customer | null;
  submitLabel?: string;
  successMessage?: string;
  onSuccess?: (state: ActionResult & { customerId?: string }) => void;
  footer?: React.ReactNode;
};

export function CustomerForm({
  action,
  customer,
  submitLabel = "Save customer",
  successMessage = "Saved successfully.",
  onSuccess,
  footer,
}: CustomerFormProps) {
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
  useActionToast(state, { successMessage, onSuccess });

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name *</Label>
          <Input
            id="first_name"
            name="first_name"
            defaultValue={customer?.first_name ?? ""}
            required
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            name="last_name"
            defaultValue={customer?.last_name ?? ""}
            className="h-11"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={customer?.phone ?? ""}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={customer?.email ?? ""}
            className="h-11"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input
          id="tags"
          name="tags"
          placeholder="VIP, New, Bridal"
          defaultValue={customer?.tags?.join(", ") ?? ""}
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={customer?.notes ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
          {pending ? "Saving…" : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}
