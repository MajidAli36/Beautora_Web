import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { Suspense } from "react";
import { getCustomers } from "@/lib/actions/customers";
import { canDeleteCustomers, canManageCustomers } from "@/lib/auth/permissions";
import { CustomerSearch } from "@/components/features/customers/customer-search";
import { CustomersTable } from "@/components/features/customers/customers-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type CustomersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q } = await searchParams;
  const [customers, canEdit, canDelete] = await Promise.all([
    getCustomers(q),
    canManageCustomers(),
    canDeleteCustomers(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
        title="Customers"
        description="Manage your salon&apos;s customer records."
      />
        {canEdit && (
          <Button render={<Link href="/customers/new" />}>Add customer</Button>
        )}
      </div>

      <Suspense fallback={<Skeleton className="h-10 max-w-sm" />}>
        <CustomerSearch />
      </Suspense>

      <CustomersTable customers={customers} canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
