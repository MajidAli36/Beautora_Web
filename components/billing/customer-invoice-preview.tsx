"use client";

import { useEffect, useState } from "react";
import { FileImage, Loader2 } from "lucide-react";
import { getSubscriptionInvoiceUrl } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

/** Loads and shows the customer-uploaded JazzCash invoice (image preview or open PDF). */
export function CustomerInvoicePreview({
  paymentId,
  mime,
}: {
  paymentId: string;
  mime?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getSubscriptionInvoiceUrl(paymentId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error || !result.url) {
        setError(result.error ?? "Could not load invoice");
        return;
      }
      setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const isPdf = (mime ?? "").includes("pdf");

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border bg-muted/40 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading invoice…
      </div>
    );
  }

  if (error || !url) {
    return <p className="text-sm text-destructive">{error ?? "Invoice unavailable"}</p>;
  }

  if (isPdf) {
    return (
      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">Customer uploaded a PDF invoice.</p>
        <Button size="sm" variant="outline" render={<a href={url} target="_blank" rel="noreferrer" />}>
          <FileImage className="mr-1.5 size-3.5" />
          Open PDF invoice
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Invoice / payment screenshot from customer
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-lg border bg-muted/20"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Customer payment invoice"
          className="max-h-72 w-full object-contain"
        />
      </a>
      <Button size="sm" variant="outline" render={<a href={url} target="_blank" rel="noreferrer" />}>
        Open full size
      </Button>
    </div>
  );
}
