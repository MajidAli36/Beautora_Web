"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import { updateServiceUsageRecipe } from "@/lib/actions/services";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ServiceUsageRecipeFields,
  type ConsumableProductOption,
  type UsageRecipeRow,
} from "@/components/features/services/service-usage-recipe-fields";
import type { ActionResult } from "@/lib/actions/customers";

type ServiceRef = {
  id: string;
  name: string;
  usageCount?: number;
  usageRows?: UsageRecipeRow[];
};

export function UseInHouseStockButton({
  service,
  consumables,
}: {
  service: ServiceRef;
  consumables: ConsumableProductOption[];
}) {
  const [open, setOpen] = useState(false);
  const hasRecipe = (service.usageCount ?? service.usageRows?.length ?? 0) > 0;

  return (
    <>
      <Button
        type="button"
        variant={hasRecipe ? "outline" : "secondary"}
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Package className="size-3.5" />
        {hasRecipe ? "In-house stock" : "Use in-house stock"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Use in-house stock</DialogTitle>
            <DialogDescription>
              Link back-bar products for <strong>{service.name}</strong>. These are included in
              the service — customers are charged the service price only. Stock and cost are
              tracked automatically at POS (staff can still adjust qty on checkout).
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <UseInHouseStockForm
              key={`${service.id}-usage`}
              service={service}
              consumables={consumables}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UseInHouseStockForm({
  service,
  consumables,
  onDone,
}: {
  service: ServiceRef;
  consumables: ConsumableProductOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const action = useMemo(
    () =>
      async (_prev: ActionResult, formData: FormData) =>
        updateServiceUsageRecipe(service.id, _prev, formData),
    [service.id]
  );
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
  useActionToast(state, {
    successMessage: "In-house stock linked.",
    onSuccess: () => {
      onDone();
      window.setTimeout(() => router.refresh(), 320);
    },
  });

  return (
    <form action={formAction} className="grid gap-4">
      <ServiceUsageRecipeFields
        consumables={consumables}
        initialRows={service.usageRows ?? []}
        idPrefix={`usage_${service.id}`}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save stock usage"}
        </Button>
      </DialogFooter>
    </form>
  );
}
