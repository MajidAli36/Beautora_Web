"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchFieldProps = {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
};

/**
 * Debounced search input (default 300ms) — SyncOps toolbar pattern.
 */
export function SearchField({
  value: controlled,
  defaultValue = "",
  placeholder = "Search…",
  onSearch,
  debounceMs = 300,
  className,
  inputClassName,
  "aria-label": ariaLabel = "Search",
}: SearchFieldProps) {
  const [value, setValue] = useState(controlled ?? defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (controlled !== undefined) setValue(controlled);
  }, [controlled]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function commit(next: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSearchRef.current(next);
    }, debounceMs);
  }

  return (
    <div className={cn("relative min-w-0 w-full sm:max-w-md", className)}>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          commit(next);
        }}
        onBlur={() => {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
          onSearchRef.current(value);
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("h-11 pl-9 sm:h-9", inputClassName)}
      />
    </div>
  );
}
