"use client";

import { useActionState } from "react";
import {
  updateAttendancePolicy,
  type AttendancePolicy,
} from "@/lib/actions/staff-fines";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types/commerce";

export function AttendancePolicyForm({ policy }: { policy: AttendancePolicy }) {
  const [state, formAction, pending] = useActionState(
    updateAttendancePolicy,
    {} as ActionResult
  );
  useActionToast(state, { successMessage: "Attendance & late policy saved." });

  return (
    <form action={formAction} className="grid max-w-xl gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm text-muted-foreground">
          Default duty window and late rules for the whole salon. Staff can also have
          their own start/end on their profile. Example: duty 10:00, 15 min grace, 3 free
          late days/month — the 4th late day applies the fine (owner can waive).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="default_duty_start">Default duty start</Label>
        <Input
          id="default_duty_start"
          name="default_duty_start"
          type="time"
          required
          defaultValue={policy.default_duty_start}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="default_duty_end">Default duty end</Label>
        <Input
          id="default_duty_end"
          name="default_duty_end"
          type="time"
          required
          defaultValue={policy.default_duty_end}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="late_grace_minutes">Grace time (minutes)</Label>
        <Input
          id="late_grace_minutes"
          name="late_grace_minutes"
          type="number"
          min={0}
          max={240}
          required
          defaultValue={policy.late_grace_minutes}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="late_allowed_days_per_month">
          Free late days / month
        </Label>
        <Input
          id="late_allowed_days_per_month"
          name="late_allowed_days_per_month"
          type="number"
          min={0}
          max={31}
          required
          defaultValue={policy.late_allowed_days_per_month}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="late_fine_amount">
          Fine amount (after free late days used)
        </Label>
        <Input
          id="late_fine_amount"
          name="late_fine_amount"
          type="number"
          min={0}
          step="0.01"
          required
          defaultValue={policy.late_fine_amount}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save attendance policy"}
        </Button>
      </div>
    </form>
  );
}
