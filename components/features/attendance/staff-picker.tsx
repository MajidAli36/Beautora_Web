"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type StaffPickerOption = { id: string; full_name: string };

type StaffPickerProps = {
  staff: StaffPickerOption[];
  value?: string;
  onValueChange?: (staffId: string) => void;
  name?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

/**
 * In-flow staff picker (not absolute). Avoids Card/Tabs overflow clipping
 * that made the old dropdown look like an empty blue bar.
 */
export function StaffPicker({
  staff,
  value = "",
  onValueChange,
  name = "staff_id",
  id,
  placeholder = "Search staff name…",
  disabled = false,
  required = false,
  className,
}: StaffPickerProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) =>
      (s.full_name ?? "").toLowerCase().includes(q)
    );
  }, [staff, query]);

  const selected = staff.find((s) => s.id === value) ?? null;

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="hidden"
        name={name}
        value={value}
        required={required && !disabled}
      />

      {!disabled ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            type="search"
            autoComplete="off"
            placeholder={placeholder}
            className="h-9 bg-background pl-8"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      ) : null}

      {disabled ? (
        <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Staff picker ignored while “All active staff” is selected.
        </p>
      ) : staff.length === 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          No active staff found. Add someone under Salon team first.
        </p>
      ) : (
        <ul
          role="listbox"
          aria-label="Staff members"
          className="max-h-48 overflow-y-auto rounded-lg border border-border bg-background"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">
              No match for “{query.trim()}”
            </li>
          ) : (
            filtered.map((s) => {
              const active = value === s.id;
              return (
                <li key={s.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                    onClick={() => onValueChange?.(s.id)}
                  >
                    <span className="font-medium">{s.full_name || "Unnamed staff"}</span>
                    {active ? (
                      <span className="ml-auto text-xs opacity-90">Selected</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {selected && !disabled ? (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{selected.full_name}</span>
          {" · "}
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => onValueChange?.("")}
          >
            Clear
          </button>
        </p>
      ) : null}
    </div>
  );
}
