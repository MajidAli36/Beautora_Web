"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { getLocalDateString } from "@/lib/dates/local";
import type { PosAppointment } from "@/lib/actions/appointments";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AppointmentPickerProps = {
  appointments: PosAppointment[];
  value: string;
  onValueChange: (appointmentId: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
  emptyLabel?: string;
  limit?: number;
};

function formatApptLabel(a: PosAppointment) {
  const date = new Date(a.scheduledAt);
  const isToday = getLocalDateString(date) === getLocalDateString();
  const time = formatTime(date);
  const day = isToday ? time : `${formatDate(date)} ${time}`;
  const advance = a.depositBalance > 0 ? ` · ${formatCurrency(a.depositBalance)} advance` : "";
  return `${day} — ${a.customerName}${advance}`;
}

export function AppointmentPicker({
  appointments,
  value,
  onValueChange,
  id,
  placeholder = "Search today’s appointments…",
  className,
  emptyLabel = "None — walk-in sale",
  limit = 14,
}: AppointmentPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = useMemo(
    () => appointments.find((a) => a.id === value) ?? null,
    [appointments, value]
  );

  const [query, setQuery] = useState(() => (selected ? formatApptLabel(selected) : ""));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!value) {
      setQuery("");
      return;
    }
    const a = appointments.find((row) => row.id === value);
    if (a) setQuery(formatApptLabel(a));
  }, [value, appointments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return appointments.slice(0, limit);
    return appointments
      .filter((a) => {
        const label = formatApptLabel(a).toLowerCase();
        const phoneHint = a.customerName.toLowerCase();
        return label.includes(q) || phoneHint.includes(q) || a.status.toLowerCase().includes(q);
      })
      .slice(0, limit);
  }, [appointments, query, limit]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectAppointment(a: PosAppointment | null) {
    if (!a) {
      onValueChange("");
      setQuery("");
      setOpen(false);
      return;
    }
    onValueChange(a.id);
    setQuery(formatApptLabel(a));
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const max = filtered.length; // + empty at 0
      setHighlight((h) => Math.min(h + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (highlight === 0) {
        selectAppointment(null);
        return;
      }
      const a = filtered[highlight - 1];
      if (a) selectAppointment(a);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          className="h-9 pl-8 pr-8"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
            if (value) onValueChange("");
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {(query || value) && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => selectAppointment(null)}
            aria-label="Clear appointment"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          <li
            role="option"
            aria-selected={!value}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1.5 text-sm text-muted-foreground",
              highlight === 0 && "bg-accent text-accent-foreground"
            )}
            onMouseEnter={() => setHighlight(0)}
            onMouseDown={(e) => {
              e.preventDefault();
              selectAppointment(null);
            }}
          >
            {emptyLabel}
          </li>
          {filtered.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">No matches today</li>
          ) : (
            filtered.map((a, i) => {
              const idx = i + 1;
              return (
                <li
                  key={a.id}
                  role="option"
                  aria-selected={value === a.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                    highlight === idx && "bg-accent text-accent-foreground"
                  )}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectAppointment(a);
                  }}
                >
                  <span className="min-w-0 truncate">{formatApptLabel(a)}</span>
                  {a.depositBalance > 0 ? (
                    <Badge variant="secondary" className="shrink-0 text-primary">
                      {formatCurrency(a.depositBalance)}
                    </Badge>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
