"use client";

import { useRouter } from "next/navigation";
import { createCustomerInline, updateCustomer } from "@/lib/actions/customers";
import { CustomerForm } from "@/components/features/customers/customer-form";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CustomerDirectoryRow } from "@/lib/actions/customers";

type CustomerFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  customer?: CustomerDirectoryRow | null;
  /** Called after a successful create (POS can select the new customer immediately). */
  onCreated?: (customerId: string) => void;
};

export function CustomerFormSheet({
  open,
  onOpenChange,
  mode,
  customer,
  onCreated,
}: CustomerFormSheetProps) {
  const router = useRouter();

  const action =
    mode === "edit" && customer
      ? updateCustomer.bind(null, customer.id)
      : createCustomerInline;

  const formCustomer =
    mode === "edit" && customer
      ? ({
          id: customer.id,
          organization_id: "",
          first_name: customer.first_name,
          last_name: customer.last_name,
          phone: customer.phone,
          email: customer.email,
          notes: customer.notes,
          tags: customer.tags,
          deleted_at: null,
          deleted_by: null,
          deleted_by_role: null,
          created_by: null,
          updated_by: null,
          created_at: customer.created_at,
          updated_at: customer.created_at,
        } as const)
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
        showCloseButton
      >
        <SheetHeader className="border-b border-border px-4 py-4 sm:px-5">
          <SheetTitle className="text-lg font-semibold">
            {mode === "add" ? "Add customer" : "Edit customer"}
          </SheetTitle>
          <SheetDescription>
            {mode === "add"
              ? "Name, phone, and tags help you find clients at POS."
              : "Update contact details and notes."}
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-5 sm:px-5">
          {open ? (
            <CustomerForm
              key={
                mode === "edit"
                  ? `edit-${customer?.id}`
                  : `add-${String(open)}`
              }
              action={action}
              customer={formCustomer as never}
              submitLabel={mode === "add" ? "Add customer" : "Save changes"}
              successMessage={
                mode === "add"
                  ? "Customer added successfully."
                  : "Customer updated successfully."
              }
              onSuccess={(result) => {
                onOpenChange(false);
                if (mode === "add" && result.customerId) {
                  onCreated?.(result.customerId);
                }
                router.refresh();
              }}
              footer={
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full sm:w-auto"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              }
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
