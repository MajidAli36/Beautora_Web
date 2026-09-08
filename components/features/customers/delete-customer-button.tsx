"use client";

import { deleteCustomer } from "@/lib/actions/customers";
import { ConfirmAction } from "@/components/ui/confirm-action";

type DeleteCustomerButtonProps = {
  customerId: string;
  customerName: string;
};

export function DeleteCustomerButton({
  customerId,
  customerName,
}: DeleteCustomerButtonProps) {
  return (
    <ConfirmAction
      title="Delete customer?"
      description={`This will remove ${customerName} from your customer list. This action can be undone by an admin later.`}
      confirmLabel="Delete"
      pendingLabel="Deleting…"
      variant="destructive"
      successMessage="Customer deleted."
      onConfirm={async () => deleteCustomer(customerId)}
    >
      Delete
    </ConfirmAction>
  );
}
