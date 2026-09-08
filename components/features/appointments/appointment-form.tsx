"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AppointmentOrderSummary } from "@/components/features/appointments/appointment-order-summary";
import { createAppointment } from "@/lib/actions/appointments";
import { useActionToast } from "@/hooks/use-action-toast";
import { SlotPicker } from "@/components/features/booking/slot-picker";
import { CustomerPicker } from "@/components/features/customers/customer-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getLocalDateString } from "@/lib/dates/local";
import type { ActionResult } from "@/types/commerce";

type Props = {
  customers: { id: string; first_name: string; last_name: string | null; phone?: string | null }[];
  staff: { id: string; full_name: string }[];
  services: { id: string; name: string; price: number; duration_minutes: number }[];
};

export function AppointmentForm({ customers, staff, services }: Props) {
  const [state, formAction, pending] = useActionState(createAppointment, {} as ActionResult);
  useActionToast(state, { successMessage: "Appointment booked." });
  const [date, setDate] = useState(getLocalDateString);
  const [staffId, setStaffId] = useState("none");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");

  function toggleService(id: string) {
    setServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const selectedServices = services.filter((s) => serviceIds.includes(s.id));

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3 sm:col-span-2">
        <Label>Customer *</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={customerMode === "existing" ? "default" : "outline"}
            onClick={() => setCustomerMode("existing")}
          >
            Existing customer
          </Button>
          <Button
            type="button"
            size="sm"
            variant={customerMode === "new" ? "default" : "outline"}
            onClick={() => {
              setCustomerMode("new");
              setCustomerId("");
            }}
          >
            New customer
          </Button>
        </div>
        {customerMode === "existing" ? (
          <div className="space-y-2">
            <CustomerPicker
              customers={customers.map((c) => ({
                id: c.id,
                first_name: c.first_name,
                last_name: c.last_name,
                phone: c.phone ?? null,
              }))}
              value={customerId}
              onValueChange={setCustomerId}
              name="customer_id"
              required
              placeholder="Search name or phone…"
            />
          </div>
        ) : (
          <div className="grid gap-3 rounded-lg border border-dashed border-border p-3 sm:grid-cols-3">
            <p className="sm:col-span-3 text-xs text-muted-foreground">
              If this person is not in your customer list yet, we create their profile automatically
              (matched by phone when provided).
            </p>
            <div className="space-y-2">
              <Label htmlFor="first_name">First name *</Label>
              <Input id="first_name" name="first_name" required placeholder="First name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" name="last_name" placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" placeholder="For matching / WhatsApp" />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="staff_id">Staff</Label>
        <select
          id="staff_id"
          name="staff_id"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="none">Any available</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="appt_date">Date *</Label>
        <Input
          id="appt_date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <SlotPicker
          date={date}
          staffId={staffId === "none" ? undefined : staffId}
          serviceIds={serviceIds}
          onSuggestDate={setDate}
        />
        <p className="text-xs text-muted-foreground">
          Times come from staff working hours (shared with online booking).{" "}
          <Link
            href="/appointments#working-hours"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Manage hours & slots
          </Link>
        </p>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label>Services</Label>
        <div className="grid max-h-40 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={serviceIds.includes(s.id)}
                onChange={() => toggleService(s.id)}
                className="size-4 rounded border"
              />
              {s.name} ({s.duration_minutes} min)
            </label>
          ))}
        </div>
        {serviceIds.map((id) => (
          <input key={id} type="hidden" name="service_ids" value={id} />
        ))}
      </div>

      {selectedServices.length > 0 && (
        <div className="sm:col-span-2">
          <AppointmentOrderSummary
            services={selectedServices.map((s) => ({
              name: s.name,
              price: s.price,
              duration_minutes: s.duration_minutes,
            }))}
          />
        </div>
      )}

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      <div className="sm:col-span-2 space-y-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
        <div>
          <p className="text-sm font-medium">Advance payment (optional)</p>
          <p className="text-xs text-muted-foreground">
            One-time deposit per appointment — applied at POS checkout. Leave blank if no advance now.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="advance_amount">Amount (Rs)</Label>
            <Input id="advance_amount" name="advance_amount" type="number" min={0} step={1} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advance_method">Method</Label>
            <select
              id="advance_method"
              name="advance_method"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue="CASH"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="advance_notes">Note</Label>
            <Input id="advance_notes" name="advance_notes" placeholder="Advance at booking" />
          </div>
        </div>
      </div>

      <div className="sm:col-span-2 flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Booking…" : "Book appointment"}
        </Button>
      </div>
    </form>
  );
}
