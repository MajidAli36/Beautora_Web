"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All payment statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

const SEARCH_DEBOUNCE_MS = 350;

export function SalesSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlQ = searchParams.get("q") ?? "";
  const urlPayment = searchParams.get("payment") ?? "";
  const [value, setValue] = useState(urlQ);
  const [paymentStatus, setPaymentStatus] = useState(urlPayment);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paymentRef = useRef(paymentStatus);
  paymentRef.current = paymentStatus;

  useEffect(() => {
    if (!focused) setValue(urlQ);
  }, [urlQ, focused]);

  useEffect(() => {
    setPaymentStatus(urlPayment);
  }, [urlPayment]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function commitUrl(nextQ: string, nextPayment: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPayment) params.set("payment", nextPayment);
    const qs = params.toString();
    if (qs === searchParams.toString()) return;
    startTransition(() => {
      router.replace(qs ? `/sales?${qs}` : "/sales");
    });
  }

  function onSearchChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commitUrl(next, paymentRef.current);
    }, SEARCH_DEBOUNCE_MS);
  }

  function onPaymentChange(next: string) {
    setPaymentStatus(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    commitUrl(value, next);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-[16rem] max-w-md flex-1">
        <Label htmlFor="sales-search" className="sr-only">
          Search sales
        </Label>
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="sales-search"
          placeholder="Search invoice, customer, phone…"
          className={cn("pl-9", isPending && "opacity-80")}
          value={value}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
              debounceRef.current = null;
            }
            commitUrl(value, paymentRef.current);
          }}
        />
      </div>
      <div className="w-full space-y-1 sm:w-52">
        <Label htmlFor="sales-payment-status" className="text-xs text-muted-foreground">
          Payment status
        </Label>
        <select
          id="sales-payment-status"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          value={paymentStatus}
          onChange={(e) => onPaymentChange(e.target.value)}
        >
          {PAYMENT_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
