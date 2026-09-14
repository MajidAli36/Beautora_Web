"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { updateService } from "@/lib/actions/services";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/actions/customers";
import type { ServiceCategory } from "@/types";
import type { UsageRecipeRow } from "@/components/features/services/service-usage-recipe-fields";

export type EditableService = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  category_id: string | null;
  category: { id: string; name: string } | null;
  usageCount?: number;
  usageRows?: UsageRecipeRow[];
};

export function EditServiceButton({
  service,
  categories,
}: {
  service: EditableService;
  categories: ServiceCategory[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent key={service.id}>
          <DialogHeader>
            <DialogTitle>Edit service</DialogTitle>
            <DialogDescription>
              Update name, price, and duration. Link cream/wax usage with{" "}
              <strong>Use in-house stock</strong> on the list.
            </DialogDescription>
          </DialogHeader>
          {open ? (
            <EditServiceForm
              key={`${service.id}-open`}
              service={service}
              categories={categories}
              onDone={() => setOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function EditServiceForm({
  service,
  categories,
  onDone,
}: {
  service: EditableService;
  categories: ServiceCategory[];
  onDone: () => void;
}) {
  const router = useRouter();
  const action = useMemo(
    () =>
      async (_prev: ActionResult, formData: FormData) =>
        updateService(service.id, _prev, formData),
    [service.id]
  );
  const [state, formAction, pending] = useActionState(action, {} as ActionResult);
  useActionToast(state, {
    successMessage: "Service updated.",
    onSuccess: () => {
      onDone();
      window.setTimeout(() => router.refresh(), 320);
    },
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`edit_svc_name_${service.id}`}>Service name *</Label>
        <Input
          id={`edit_svc_name_${service.id}`}
          name="name"
          required
          defaultValue={service.name}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`edit_svc_desc_${service.id}`}>Description</Label>
        <Textarea
          id={`edit_svc_desc_${service.id}`}
          name="description"
          rows={2}
          defaultValue={service.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_svc_cat_${service.id}`}>Category</Label>
        <select
          id={`edit_svc_cat_${service.id}`}
          name="category_id"
          defaultValue={service.category_id ?? service.category?.id ?? "none"}
          className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="none">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_svc_price_${service.id}`}>Price (PKR) *</Label>
        <Input
          id={`edit_svc_price_${service.id}`}
          name="price"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={service.price}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`edit_svc_dur_${service.id}`}>Duration (minutes) *</Label>
        <Input
          id={`edit_svc_dur_${service.id}`}
          name="duration_minutes"
          type="number"
          min={1}
          required
          defaultValue={service.duration_minutes}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id={`edit_svc_active_${service.id}`}
          name="is_active"
          type="checkbox"
          defaultChecked={service.is_active}
          className="size-4 rounded border"
        />
        <Label htmlFor={`edit_svc_active_${service.id}`}>Active</Label>
      </div>
      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
