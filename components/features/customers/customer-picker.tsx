"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatCustomerName } from "@/lib/format";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type CustomerOption = {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
};

type CustomerPickerProps = {
  customers: CustomerOption[];
  /** Hidden input name for native form posts (uncontrolled). */
  name?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  /** Controlled selected customer id (empty string = none / walk-in). */
  value?: string;
  onValueChange?: (customerId: string) => void;
  /** Show a clearable empty choice (e.g. Walk-in on POS). */
  allowEmpty?: boolean;
  emptyLabel?: string;
  /** Max results shown while searching. */
  limit?: number;
};

function labelFor(c: CustomerOption) {
  return formatCustomerName(c.first_name, c.last_name) + (c.phone ? ` · ${c.phone}` : "");
}

export function CustomerPicker({
  customers,
  name,
  required = false,
  id,
  placeholder = "Search name or phone…",
  className,
  value,
  onValueChange,
  allowEmpty = false,
  emptyLabel = "Walk-in",
  limit = 12,
}: CustomerPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const [innerId, setInnerId] = useState(value ?? "");
  const selectedId = controlled ? value : innerId;

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedId) ?? null,
    [customers, selectedId]
  );

  const [query, setQuery] = useState(() => (selected ? labelFor(selected) : ""));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Sync display when controlled value changes from outside (e.g. POS appointment link)
  useEffect(() => {
    if (!controlled) return;
    if (!value) {
      setQuery("");
      return;
    }
    const c = customers.find((row) => row.id === value);
    if (c) setQuery(labelFor(c));
  }, [controlled, value, customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, limit);
    return customers
      .filter((c) => {
        const full = formatCustomerName(c.first_name, c.last_name).toLowerCase();
        const phone = (c.phone ?? "").toLowerCase();
        return full.includes(q) || phone.includes(q);
      })
      .slice(0, limit);
  }, [customers, query, limit]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function setSelected(nextId: string, displayQuery: string) {
    if (!controlled) setInnerId(nextId);
    onValueChange?.(nextId);
    setQuery(displayQuery);
    setOpen(false);
  }

  function selectCustomer(c: CustomerOption) {
    setSelected(c.id, labelFor(c));
  }

  function clearSelection() {
    setSelected("", "");
    setOpen(true);
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
      if (filtered[idx]) selectCustomer(filtered[idx]);
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
            onClick={clearSelection}
            aria-label="Clear customer"
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
                  "flex w-full items-start rounded-md px-2.5 py-1.5 text-left hover:bg-accent",
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
            <li className="px-2.5 py-2 text-muted-foreground">No customers found</li>
          ) : (
            filtered.map((c, i) => {
              const rowIndex = allowEmpty ? i + 1 : i;
              const label = formatCustomerName(c.first_name, c.last_name);
              return (
                <li key={c.id} role="option" aria-selected={selectedId === c.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left hover:bg-accent",
                      rowIndex === highlight && "bg-accent"
                    )}
                    onMouseEnter={() => setHighlight(rowIndex)}
                    onClick={() => selectCustomer(c)}
                  >
                    <span className="font-medium">{label}</span>
                    {c.phone && (
                      <span className="text-xs text-muted-foreground">{c.phone}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {required && !allowEmpty && !selectedId && query.trim() !== "" && (
        <p className="mt-1 text-xs text-amber-600">Pick a customer from the list</p>
      )}
    </div>
  );
}
