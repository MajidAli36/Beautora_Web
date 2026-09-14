"use client";

import { useMemo, useState, useTransition } from "react";
import { setStaffOnlineBooking } from "@/lib/actions/scheduling";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { notify } from "@/lib/toast";

type StaffRow = {
  id: string;
  full_name: string;
  job_title: string | null;
  online_booking_enabled: boolean;
};

type StaffOnlineToggleProps = {
  staff: StaffRow[];
  onStaffChange?: (staff: StaffRow[]) => void;
};

export function StaffOnlineToggle({ staff, onStaffChange }: StaffOnlineToggleProps) {
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter(
      (s) =>
        s.full_name.toLowerCase().includes(term) ||
        (s.job_title ?? "").toLowerCase().includes(term) ||
        (s.online_booking_enabled ? "enabled" : "disabled").includes(term)
    );
  }, [staff, q]);

  function toggle(staffId: string, enabled: boolean) {
    const previous = staff;
    const optimistic = staff.map((s) =>
      s.id === staffId ? { ...s, online_booking_enabled: enabled } : s
    );
    onStaffChange?.(optimistic);

    startTransition(async () => {
      const result = await setStaffOnlineBooking(staffId, enabled);
      if (result.error) {
        onStaffChange?.(previous);
        notify.error(result.error);
        return;
      }
      notify.success(enabled ? "Shown on online booking." : "Hidden from online booking.");
    });
  }

  if (!staff.length) {
    return <p className="text-sm text-muted-foreground">Add staff members first.</p>;
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Search name, title, status…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="max-w-sm"
      />
      {!filtered.length ? (
        <p className="text-sm text-muted-foreground">No staff match your search.</p>
      ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Online booking</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="font-medium">{s.full_name}</TableCell>
            <TableCell>{s.job_title ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={s.online_booking_enabled ? "default" : "secondary"}>
                {s.online_booking_enabled ? "Enabled" : "Disabled"}
              </Badge>
            </TableCell>
            <TableCell>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => toggle(s.id, !s.online_booking_enabled)}
              >
                {s.online_booking_enabled ? "Disable" : "Enable"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
      )}
    </div>
  );
}
