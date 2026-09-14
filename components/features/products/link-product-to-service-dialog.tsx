"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2 } from "lucide-react";
import { linkInHouseProductToService } from "@/lib/actions/services";
import { finishDialogSuccess } from "@/hooks/use-action-toast";
import { notify } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ServiceOption = { id: string; name: string; is_active: boolean };

type ProductRef = {
  id: string;
  name: string;
  unit_label?: string | null;
  default_usage_qty?: number | null;
};

export function LinkProductToServiceButton({
  product,
  services,
  linkedServiceIds = [],
}: {
  product: ProductRef;
  services: ServiceOption[];
  linkedServiceIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const unit = product.unit_label?.trim() || "unit";
  const usePerClient = Number(product.default_usage_qty) || 0;
  const linkedCount = linkedServiceIds.length;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Link2 className="size-3.5" />
        {linkedCount > 0 ? `Services (${linkedCount})` : "Link services"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link services</DialogTitle>
            <DialogDescription>
              Check every service that should use <strong>{product.name}</strong>. The same
              product can link to many services. POS deducts this qty each time — customers still
              pay only the service price.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <LinkForm
              key={`${product.id}-${usePerClient}-${unit}-${linkedServiceIds.join(",")}`}
              productId={product.id}
              productName={product.name}
              services={services}
              linkedServiceIds={linkedServiceIds}
              unit={unit}
              usePerClient={usePerClient}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function LinkForm({
  productId,
  productName,
  services,
  linkedServiceIds,
  unit,
  usePerClient,
  onDone,
}: {
  productId: string;
  productName: string;
  services: ServiceOption[];
  linkedServiceIds: string[];
  unit: string;
  usePerClient: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const active = services.filter((s) => s.is_active);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(linkedServiceIds.filter((id) => active.some((s) => s.id === id)))
  );
  const [filter, setFilter] = useState("");
  const [qty, setQty] = useState(usePerClient > 0 ? String(usePerClient) : "");
  const qtyNum = Number(qty) || 0;
  const canSave = qtyNum > 0 && active.length > 0;

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return active;
    return active.filter((s) => s.name.toLowerCase().includes(term));
  }, [active, filter]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of filtered) next.add(s.id);
      return next;
    });
  }

  function clearVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of filtered) next.delete(s.id);
      return next;
    });
  }

  function save() {
    if (!canSave || pending) return;

    const fd = new FormData();
    fd.set("quantity", String(qtyNum));
    for (const id of active) fd.append("available_service_id", id.id);
    for (const id of selected) fd.append("service_id", id);

    startTransition(async () => {
      const result = await linkInHouseProductToService(productId, {}, fd);
      if (result.error) {
        notify.error(result.error);
        return;
      }
      const message =
        selected.size === 0
          ? "All service links removed."
          : selected.size === 1
            ? "Linked to 1 service."
            : `Linked to ${selected.size} services.`;
      finishDialogSuccess({
        close: onDone,
        message,
        refresh: () => router.refresh(),
      });
    });
  }

  if (!services.length) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          No services yet. Create a service first, then come back to link{" "}
          <strong className="text-foreground">{productName}</strong>.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="button" render={<Link href="/services" />}>
            Go to Services
          </Button>
        </DialogFooter>
      </div>
    );
  }

  if (!active.length) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground">
          All services are inactive. Activate a service on the Services page, then link here.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="button" render={<Link href="/services" />}>
            Go to Services
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border bg-muted/40 px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Qty used per client
        </p>
        {usePerClient > 0 ? (
          <>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {usePerClient}{" "}
              <span className="text-base font-medium text-muted-foreground">{unit}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied to every checked service. Change it in <strong>Edit</strong> if needed.
            </p>
          </>
        ) : (
          <div className="mt-2 space-y-2">
            <Label htmlFor={`link_qty_${productId}`}>Set use per client *</Label>
            <div className="flex items-center gap-2">
              <Input
                id={`link_qty_${productId}`}
                type="number"
                min={0.001}
                step="any"
                inputMode="decimal"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="e.g. 5"
                className="max-w-[8rem]"
                required
              />
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Services</Label>
          <p className="text-xs text-muted-foreground">
            {selected.size} selected
            {active.length ? ` · ${active.length} available` : ""}
          </p>
        </div>
        <Input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search services…"
          aria-label="Search services"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={selectAllVisible}>
            Check all{filter.trim() ? " shown" : ""}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearVisible}>
            Uncheck all{filter.trim() ? " shown" : ""}
          </Button>
        </div>
        <div
          className="max-h-[min(18rem,45vh)] space-y-1 overflow-y-auto rounded-lg border p-2"
          role="group"
          aria-label="Services to link"
        >
          {filtered.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No services match.</p>
          ) : (
            filtered.map((s) => {
              const checked = selected.has(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                    checked ? "bg-primary/10" : "hover:bg-muted/60"
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 rounded border-input accent-primary"
                    checked={checked}
                    onChange={() => toggle(s.id)}
                  />
                  <span className="min-w-0 flex-1 font-medium">{s.name}</span>
                  {linkedServiceIds.includes(s.id) && !checked ? (
                    <span className="text-xs text-amber-700">will unlink</span>
                  ) : null}
                  {checked && linkedServiceIds.includes(s.id) ? (
                    <span className="text-xs text-muted-foreground">linked</span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Uncheck a service to remove this product from that service&apos;s recipe.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
        <Button type="button" disabled={pending || !canSave} onClick={save}>
          {pending ? "Saving…" : "Save links"}
        </Button>
      </DialogFooter>
    </div>
  );
}
