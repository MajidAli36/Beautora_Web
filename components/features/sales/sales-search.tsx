"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All payment statuses" },
  { value: "PAID", label: "Paid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_REFUNDED", label: "Partially refunded" },
  { value: "REFUNDED", label: "Refunded" },
] as const;

export function SalesSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get("payment") ?? "");

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
    setPaymentStatus(searchParams.get("payment") ?? "");
  }, [searchParams]);

  const replaceParams = useCallback(
    (patch: { q?: string; payment?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      const nextQ = patch.q !== undefined ? patch.q : params.get("q") ?? "";
      const nextPayment =
        patch.payment !== undefined ? patch.payment : params.get("payment") ?? "";

      if (nextQ.trim()) params.set("q", nextQ.trim());
      else params.delete("q");

      if (nextPayment) params.set("payment", nextPayment);
      else params.delete("payment");

      startTransition(() => {
        router.replace(`/sales?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

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
          className="pl-9"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            replaceParams({ q: e.target.value });
          }}
          disabled={isPending}
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
          disabled={isPending}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            replaceParams({ payment: e.target.value });
          }}
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
