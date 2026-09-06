import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createCustomer } from "@/lib/actions/customers";
import { canManageCustomers } from "@/lib/auth/permissions";
import { CustomerForm } from "@/components/features/customers/customer-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewCustomerPage() {
  const canEdit = await canManageCustomers();
  if (!canEdit) redirect("/customers");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
        title="New customer"
        description="Add a new customer record."
      />
        <Button variant="outline" render={<Link href="/customers" />}>
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer details</CardTitle>
          <CardDescription>
            Phone or email helps you find customers quickly at checkout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerForm action={createCustomer} submitLabel="Create customer" />
        </CardContent>
      </Card>
    </div>
  );
}
