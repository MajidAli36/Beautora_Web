"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { linkInHouseProductToService } from "@/lib/actions/services";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/types/commerce";

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
        Link to service
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link to service</DialogTitle>
            <DialogDescription>
              When <strong>{product.name}</strong> is used on a service, POS deducts the amount
              below each time. Customers still pay only the service price — this stock is tracked
              internally. Change use-per-client only in <strong>Edit</strong> on this product.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <LinkForm
              key={`${product.id}-${usePerClient}-${unit}`}
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
  const action = useMemo(
    () =>
      async (_prev: ActionResult, formData: FormData) =>
        linkInHouseProductToService(productId, _prev, formData),
    [productId]
  );
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
  useActionToast(state, {
    successMessage: "Linked to service.",
    onSuccess: () => {
      onDone();
      router.refresh();
    },
  });

  const active = services.filter((s) => s.is_active);
  const defaultService =
    active.find((s) => !linkedServiceIds.includes(s.id))?.id ?? active[0]?.id ?? "";
  const hasUseQty = usePerClient > 0;

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="quantity" value={hasUseQty ? String(usePerClient) : ""} />

      <div className="rounded-lg border bg-muted/40 px-3 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Qty used per client
        </p>
        {hasUseQty ? (
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {usePerClient}{" "}
            <span className="text-base font-medium text-muted-foreground">{unit}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-destructive">
            Not set yet. Open <strong>Edit</strong> on {productName}, set Use per client (e.g. 5{" "}
            {unit}), save, then link here.
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Locked here — deducted automatically at POS, never billed as a separate line.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`link_svc_${productId}`}>Service *</Label>
        <select
          id={`link_svc_${productId}`}
          name="service_id"
          required
          defaultValue={defaultService}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="">Select service…</option>
          {active.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {linkedServiceIds.includes(s.id) ? " (already linked)" : ""}
            </option>
          ))}
        </select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || !active.length || !hasUseQty}>
          {pending ? "Saving…" : "Save link"}
        </Button>
      </DialogFooter>
    </form>
  );
}
