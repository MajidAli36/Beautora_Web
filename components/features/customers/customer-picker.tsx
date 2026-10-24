"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
  name?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (customerId: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  limit?: number;
  searchRemote?: (query: string) => Promise<CustomerOption[]>;
};

function labelFor(c: CustomerOption) {
  return formatCustomerName(c.first_name, c.last_name) + (c.phone ? ` · ${c.phone}` : "");
}

function filterLocal(customers: CustomerOption[], query: string, limit: number) {
  const q = query.trim().toLowerCase();
  if (!q) return customers.slice(0, limit);
  const words = q.split(/\s+/).filter(Boolean);
  const qDigits = q.replace(/\D/g, "");
  return customers
    .filter((c) => {
      const full = formatCustomerName(c.first_name, c.last_name).toLowerCase();
      const first = (c.first_name ?? "").toLowerCase();
      const last = (c.last_name ?? "").toLowerCase();
      const phone = (c.phone ?? "").toLowerCase();
      const phoneDigits = phone.replace(/\D/g, "");
      if (full.includes(q) || phone.includes(q) || first.includes(q) || last.includes(q)) {
        return true;
      }
      if (words.length > 1 && words.every((w) => full.includes(w))) return true;
      if (qDigits.length >= 3 && phoneDigits.includes(qDigits)) return true;
      if (qDigits.length >= 10) {
        const tail = qDigits.slice(-10);
        if (phoneDigits.endsWith(tail)) return true;
      }
      return false;
    })
    .slice(0, limit);
}

/**
 * In-flow combobox (not absolute) so Card/sticky/overflow parents cannot clip the list.
 */
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
  limit = 25,
  searchRemote,
}: CustomerPickerProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const controlled = value !== undefined;
  const [innerId, setInnerId] = useState(value ?? "");
  const selectedId = controlled ? value! : innerId;

  const [picked, setPicked] = useState<CustomerOption | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return (
      customers.find((c) => c.id === selectedId) ||
      (picked?.id === selectedId ? picked : null)
    );
  }, [customers, selectedId, picked]);

  const [query, setQuery] = useState(() => (selected ? labelFor(selected) : ""));
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [remoteRows, setRemoteRows] = useState<CustomerOption[]>([]);
  const [pending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);

  const runRemoteSearch = useEffectEvent(async (q: string) => {
    if (!searchRemote || q.trim().length < 1) {
      setRemoteRows([]);
      return;
    }
    try {
      const rows = await searchRemote(q.trim());
      setRemoteRows(rows);
    } catch {
      setRemoteRows([]);
    }
  });

  useEffect(() => {
    if (!controlled) return;
    if (!value) {
      setPicked(null);
      if (!isSearching) setQuery("");
      return;
    }
    const c =
      customers.find((row) => row.id === value) ||
      (picked?.id === value ? picked : null) ||
      remoteRows.find((row) => row.id === value) ||
      null;
    if (!c) return;
    setPicked((prev) => (prev?.id === c.id ? prev : c));
    if (!isSearching) {
      const nextLabel = labelFor(c);
      setQuery((prev) => (prev === nextLabel ? prev : nextLabel));
    }
  }, [controlled, value, customers, remoteRows, picked, isSearching]);

  useEffect(() => {
    if (!searchRemote || !isSearching) return;
    const q = query.trim();
    if (q.length < 1) {
      setRemoteRows([]);
      return;
    }
    const t = setTimeout(() => {
      startTransition(() => {
        void runRemoteSearch(q);
      });
    }, 180);
    return () => clearTimeout(t);
  }, [query, searchRemote, isSearching]);

  const filtered = useMemo(() => {
    const searchQuery = isSearching ? query : selectedId ? "" : query;
    const local = filterLocal(customers, searchQuery, limit);
    if (!searchRemote) return local;
    const byId = new Map<string, CustomerOption>();
    const ordered = isSearching ? [...remoteRows, ...local] : [...local, ...remoteRows];
    for (const c of ordered) byId.set(c.id, c);
    if (picked && !byId.has(picked.id) && selectedId === picked.id && !isSearching) {
      byId.set(picked.id, picked);
    }
    return [...byId.values()].slice(0, limit);
  }, [customers, query, limit, searchRemote, remoteRows, picked, selectedId, isSearching]);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, []);

  function commitSelection(nextId: string, option: CustomerOption | null, displayQuery: string) {
    setIsSearching(false);
    setPicked(option);
    if (!controlled) setInnerId(nextId);
    onValueChange?.(nextId);
    setQuery(displayQuery);
    setRemoteRows([]);
    setOpen(false);
  }

  function selectCustomer(c: CustomerOption) {
    commitSelection(c.id, c, labelFor(c));
  }

  function clearSelection() {
    commitSelection("", null, "");
    setIsSearching(true);
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
        commitSelection("", null, "");
        return;
      }
      const idx = allowEmpty ? highlight - 1 : highlight;
      if (filtered[idx]) selectCustomer(filtered[idx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={cn("space-y-2", className)}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selectedId}
          required={required && !allowEmpty}
        />
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
          className="h-9 bg-background pl-8 pr-8"
          value={query}
          onChange={(e) => {
            setIsSearching(true);
            setQuery(e.target.value);
            setHighlight(0);
            if (selectedId) {
              setPicked(null);
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
            onMouseDown={(e) => {
              e.preventDefault();
              clearSelection();
            }}
            aria-label="Clear customer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="max-h-56 overflow-y-auto rounded-lg border border-border bg-background p-1 text-sm shadow-sm"
        >
          {allowEmpty ? (
            <li role="option" aria-selected={!selectedId}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-start rounded-md px-2.5 py-2 text-left font-medium",
                  !selectedId
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
                onMouseEnter={() => setHighlight(0)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitSelection("", null, "");
                }}
              >
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-muted-foreground">
              {pending
                ? "Searching…"
                : searchRemote && isSearching && query.trim().length < 1
                  ? "Type a name or phone"
                  : "No customers found"}
            </li>
          ) : (
            filtered.map((c, i) => {
              const rowIndex = allowEmpty ? i + 1 : i;
              const label = formatCustomerName(c.first_name, c.last_name);
              const active = selectedId === c.id;
              return (
                <li key={c.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                      rowIndex === highlight && !active && "bg-muted"
                    )}
                    onMouseEnter={() => setHighlight(rowIndex)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectCustomer(c);
                    }}
                  >
                    <span className="font-medium">{label || "Unnamed"}</span>
                    {c.phone ? (
                      <span
                        className={cn(
                          "text-xs",
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {c.phone}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {required && !allowEmpty && !selectedId && query.trim() !== "" ? (
        <p className="text-xs text-amber-600">Pick a customer from the list</p>
      ) : null}
    </div>
  );
}
