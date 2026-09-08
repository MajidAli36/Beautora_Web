"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StaffOption = {
  id: string;
  full_name: string;
};

type StaffPickerProps = {
  staff: StaffOption[];
  name?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (staffId: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  limit?: number;
};

export function StaffPicker({
  staff,
  name,
  required = false,
  id,
  placeholder = "Search staff…",
  className,
  value,
  onValueChange,
  allowEmpty = true,
  emptyLabel = "Any / not specified",
  limit = 12,
}: StaffPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const [innerId, setInnerId] = useState(value ?? "");
  const selectedId = controlled ? value : innerId;

  const selected = useMemo(
    () => staff.find((s) => s.id === selectedId) ?? null,
    [staff, selectedId]
  );

  const [query, setQuery] = useState(() => selected?.full_name ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    if (!controlled) return;
    if (!value) {
      setQuery("");
      return;
    }
    const s = staff.find((row) => row.id === value);
    if (s) setQuery(s.full_name);
  }, [controlled, value, staff]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff.slice(0, limit);
    return staff.filter((s) => s.full_name.toLowerCase().includes(q)).slice(0, limit);
  }, [staff, query, limit]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function setSelected(nextId: string, display: string) {
    if (!controlled) setInnerId(nextId);
    onValueChange?.(nextId);
    setQuery(display);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const max = filtered.length + (allowEmpty ? 1 : 0) - 1;
      setHighlight((h) => Math.min(h + 1, Math.max(max, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (allowEmpty && highlight === 0) {
        setSelected("", emptyLabel);
        return;
      }
      const idx = allowEmpty ? highlight - 1 : highlight;
      if (filtered[idx]) setSelected(filtered[idx].id, filtered[idx].full_name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={selectedId} required={required && !allowEmpty} />
      ) : null}
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
            if (selectedId) {
              if (!controlled) setInnerId("");
              onValueChange?.("");
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {(query || selectedId) && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSelected("", "");
              setOpen(true);
            }}
            aria-label="Clear staff"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md"
        >
          {allowEmpty && (
            <li role="option" aria-selected={!selectedId}>
              <button
                type="button"
                className={cn(
                  "flex w-full rounded-md px-2.5 py-1.5 text-left hover:bg-accent",
                  highlight === 0 && "bg-accent"
                )}
                onMouseEnter={() => setHighlight(0)}
                onClick={() => setSelected("", emptyLabel)}
              >
                <span className="font-medium text-muted-foreground">{emptyLabel}</span>
              </button>
            </li>
          )}
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-muted-foreground">No staff found</li>
          ) : (
            filtered.map((s, i) => {
              const rowIndex = allowEmpty ? i + 1 : i;
              return (
                <li key={s.id} role="option" aria-selected={selectedId === s.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full rounded-md px-2.5 py-1.5 text-left font-medium hover:bg-accent",
                      rowIndex === highlight && "bg-accent"
                    )}
                    onMouseEnter={() => setHighlight(rowIndex)}
                    onClick={() => setSelected(s.id, s.full_name)}
                  >
                    {s.full_name}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
