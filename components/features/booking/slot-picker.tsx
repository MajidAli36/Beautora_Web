"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getAvailableSlots } from "@/lib/actions/scheduling";
import type { BookableSlot, SlotEmptyReason } from "@/lib/booking/availability";
import { addLocalDays, getLocalDateString } from "@/lib/dates/local";
import { Label } from "@/components/ui/label";

type SlotPickerProps = {
  date: string;
  staffId?: string;
  serviceIds: string[];
  durationMinutes?: number;
  namePrefix?: string;
  required?: boolean;
  onSlotChange?: (slot: BookableSlot | null) => void;
  onSuggestDate?: (date: string) => void;
};

function emptyMessage(reason: SlotEmptyReason | undefined): string {
  switch (reason) {
    case "past_closing":
      return "Today’s remaining hours have ended. Pick tomorrow or extend staff working hours.";
    case "closed":
      return "This day is closed for the selected staff (or salon hours). Open it under Working hours & slots.";
    case "duration_too_long":
      return "Selected services need more time than the open hours allow. Shorten the service list or extend hours.";
    case "fully_booked":
      return "All slots are booked for this date. Try another day or staff member.";
    case "no_staff":
      return "No staff available to book. Add or select a staff member.";
    case "out_of_range":
      return "That date is outside the booking window.";
    default:
      return "No open slots for this date. Set weekly hours under Working hours & slots, or try another day.";
  }
}

export function SlotPicker({
  date,
  staffId,
  serviceIds,
  durationMinutes,
  namePrefix = "",
  required = true,
  onSlotChange,
  onSuggestDate,
}: SlotPickerProps) {
  const canFetch = Boolean(date);
  const serviceKey = serviceIds.join(",");
  const [slots, setSlots] = useState<BookableSlot[]>([]);
  const [emptyReason, setEmptyReason] = useState<SlotEmptyReason | undefined>();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!canFetch) return;
    startTransition(async () => {
      const result = await getAvailableSlots({
        date,
        staffId: staffId || undefined,
        serviceIds,
        durationMinutes,
      });
      setSlots(result.slots);
      setEmptyReason(result.emptyReason);
      setSelected("");
      onSlotChange?.(null);
    });
  }, [date, staffId, serviceKey, durationMinutes, canFetch, onSlotChange, serviceIds]);

  const visibleSlots = canFetch ? slots : [];
  const openSlots = visibleSlots.filter((s) => s.available);
  const today = getLocalDateString();
  const tomorrow = addLocalDays(today, 1);
  const showEmptyHelp =
    !pending && openSlots.length === 0 && date;
  const showTomorrowHint =
    showEmptyHelp && (emptyReason === "past_closing" || date === today);

  const isoName = `${namePrefix}slot_iso`;
  const staffName = `${namePrefix}slot_staff_id`;
  const selectedStaffId =
    visibleSlots.find((s) => s.iso === selected && s.available)?.staffId ?? "";

  return (
    <div className="space-y-2">
      <Label htmlFor={`${namePrefix}slot`}>Available time *</Label>
      <select
        id={`${namePrefix}slot`}
        name={`${namePrefix}slot_select`}
        required={required}
        value={selected}
        disabled={pending || openSlots.length === 0}
        onChange={(e) => {
          const value = e.target.value;
          const slot = visibleSlots.find((s) => s.iso === value && s.available) ?? null;
          if (!slot) {
            setSelected("");
            onSlotChange?.(null);
            return;
          }
          setSelected(value);
          onSlotChange?.(slot);
        }}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
      >
        <option value="">{pending ? "Loading slots…" : "Select time slot…"}</option>
        {visibleSlots.map((s) => {
          const suffix = staffId ? "" : ` — ${s.staffName}`;
          const label = s.available
            ? `${s.label}${suffix}`
            : `${s.label}${suffix} — Booked`;
          return (
            <option
              key={`${s.iso}-${s.staffId}`}
              value={s.available ? s.iso : `booked:${s.iso}:${s.staffId}`}
              disabled={!s.available}
            >
              {label}
            </option>
          );
        })}
      </select>
      <input type="hidden" name={isoName} value={selected} />
      <input type="hidden" name={staffName} value={selectedStaffId} />
      {showEmptyHelp && (
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>{emptyMessage(emptyReason)}</p>
          <p>
            <Link
              href="/appointments#working-hours"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Configure working hours & slots
            </Link>
            {showTomorrowHint && onSuggestDate ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => onSuggestDate(tomorrow)}
                >
                  Use tomorrow ({tomorrow})
                </button>
              </>
            ) : showTomorrowHint ? (
              <> · Try date {tomorrow}</>
            ) : null}
          </p>
        </div>
      )}
      {!pending && openSlots.length > 0 && visibleSlots.some((s) => !s.available) && (
        <p className="text-xs text-muted-foreground">Greyed-out times are already booked.</p>
      )}
    </div>
  );
}
