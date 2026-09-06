"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/toast";
import { updateStoreHours } from "@/lib/actions/store-profile";
import {
  formatHoursLine,
  type BusinessHoursDay,
} from "@/lib/store/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StoreHoursForm({ hours: initial }: { hours: BusinessHoursDay[] }) {
  const router = useRouter();
  const [hours, setHours] = useState<BusinessHoursDay[]>(initial);
  const [saving, setSaving] = useState(false);

  function patch(day: string, next: Partial<BusinessHoursDay>) {
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...next } : h)));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const result = await updateStoreHours(hours);
    setSaving(false);
    if (result.error) {
      notify.error(result.error);
      return;
    }
    notify.success("Business hours saved");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business hours</CardTitle>
        <CardDescription>
          Default open hours for the salon. Used for bookable time slots when a staff member has no
          weekly schedule for that day, and shown on your online booking page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="space-y-4">
          <ul className="divide-y rounded-lg border">
            {hours.map((h) => (
              <li
                key={h.day}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-[7rem]">
                  <p className="font-medium">{h.label}</p>
                  <p className="text-xs text-muted-foreground">{formatHoursLine(h)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={h.closed}
                      onChange={(e) => patch(h.day, { closed: e.target.checked })}
                    />
                    Closed
                  </label>
                  {!h.closed && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-xs">Open</Label>
                        <Input
                          type="time"
                          value={h.open}
                          onChange={(e) => patch(h.day, { open: e.target.value })}
                          className="w-[8.5rem]"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Close</Label>
                        <Input
                          type="time"
                          value={h.close}
                          onChange={(e) => patch(h.day, { close: e.target.value })}
                          className="w-[8.5rem]"
                        />
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save hours"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
