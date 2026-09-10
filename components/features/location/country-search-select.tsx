"use client";

import { useId, useMemo } from "react";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { Combobox } from "@base-ui/react/combobox";
import { STORE_COUNTRY_OPTIONS } from "@/lib/location/store-location";
import { cn } from "@/lib/utils";

type CountrySearchSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** marketing = onboarding auth card; app = dashboard settings */
  variant?: "marketing" | "app";
  className?: string;
};

export function CountrySearchSelect({
  value,
  onValueChange,
  id: idProp,
  name = "country",
  required,
  disabled,
  placeholder = "Search country…",
  variant = "app",
  className,
}: CountrySearchSelectProps) {
  const autoId = useId();
  const id = idProp ?? autoId;

  const items = useMemo(() => {
    const list = [...STORE_COUNTRY_OPTIONS];
    if (
      value &&
      !list.some((c) => c.toLowerCase() === value.toLowerCase())
    ) {
      list.unshift(value);
    }
    return list;
  }, [value]);

  const isMarketing = variant === "marketing";

  return (
    <Combobox.Root
      items={items}
      value={value || null}
      onValueChange={(next) => {
        if (typeof next === "string" && next.trim()) onValueChange(next);
      }}
      disabled={disabled}
      autoHighlight
    >
      {/* Keep a real form field for native required / form posts */}
      <input
        type="text"
        name={name}
        value={value}
        required={required}
        tabIndex={-1}
        aria-hidden
        readOnly
        className="sr-only"
      />

      <Combobox.Trigger
        id={id}
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-2 text-left outline-none transition-[border-color,box-shadow]",
          isMarketing
            ? "h-12 border border-[var(--m-line)] bg-white px-3.5 text-sm text-[var(--m-ink)] focus-visible:border-[var(--m-accent)] focus-visible:ring-4 focus-visible:ring-[var(--m-accent)]/15"
            : "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          disabled && "cursor-not-allowed opacity-50",
          !value && (isMarketing ? "text-[var(--m-muted)]" : "text-muted-foreground"),
          className
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {value || "Select country"}
        </span>
        <ChevronsUpDownIcon
          className={cn(
            "size-4 shrink-0",
            isMarketing ? "text-[var(--m-muted)]" : "text-muted-foreground"
          )}
        />
      </Combobox.Trigger>

      <Combobox.Portal>
        <Combobox.Positioner
          className="z-50 outline-none"
          sideOffset={4}
          align="start"
        >
          <Combobox.Popup
            className={cn(
              "flex w-[var(--anchor-width)] min-w-[var(--anchor-width)] max-w-[min(100vw-2rem,var(--available-width))] flex-col overflow-hidden border bg-popover text-popover-foreground shadow-md outline-none",
              "origin-[var(--transform-origin)] transition-[transform,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
              isMarketing
                ? "border-[var(--m-line)] bg-white text-[var(--m-ink)]"
                : "border-border rounded-lg"
            )}
            aria-label="Search country"
          >
            <div
              className={cn(
                "flex items-center gap-2 border-b px-3",
                isMarketing ? "border-[var(--m-line)]" : "border-border"
              )}
            >
              <SearchIcon
                className={cn(
                  "size-4 shrink-0",
                  isMarketing ? "text-[var(--m-muted)]" : "text-muted-foreground"
                )}
              />
              <Combobox.Input
                placeholder={placeholder}
                autoComplete="off"
                className={cn(
                  "h-10 w-full bg-transparent text-sm outline-none",
                  isMarketing
                    ? "text-[var(--m-ink)] placeholder:text-[var(--m-muted)]/70"
                    : "placeholder:text-muted-foreground"
                )}
              />
            </div>

            <Combobox.Empty
              className={cn(
                "px-3 py-4 text-sm",
                isMarketing ? "text-[var(--m-muted)]" : "text-muted-foreground"
              )}
            >
              No countries found.
            </Combobox.Empty>

            <Combobox.List
              className={cn(
                "max-h-[min(16rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0",
                isMarketing ? "scroll-py-1" : "scroll-py-1"
              )}
            >
              {(country: string) => (
                <Combobox.Item
                  key={country}
                  value={country}
                  className={cn(
                    "flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none",
                    "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                    isMarketing &&
                      "data-highlighted:bg-[var(--m-mist)] data-highlighted:text-[var(--m-ink)]"
                  )}
                >
                  <Combobox.ItemIndicator className="flex size-4 shrink-0 items-center justify-center">
                    <CheckIcon className="size-3.5" />
                  </Combobox.ItemIndicator>
                  <span className="min-w-0 flex-1 truncate">{country}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
