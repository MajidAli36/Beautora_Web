import { Suspense } from "react";
import { getCustomersDirectory } from "@/lib/actions/customers";
import { canDeleteCustomers, canManageCustomers } from "@/lib/auth/permissions";
import { CustomersDirectory } from "@/components/features/customers/customers-directory";
import { Skeleton } from "@/components/ui/skeleton";

type CustomersPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function CustomersSkeleton() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="hidden space-y-2 md:block">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function CustomersContent({ q }: { q?: string }) {
  const [directory, canEdit, canDelete] = await Promise.all([
    getCustomersDirectory(q),
    canManageCustomers(),
    canDeleteCustomers(),
  ]);

  return (
    <CustomersDirectory
      customers={directory.customers}
      newThisMonth={directory.newThisMonth}
      canEdit={canEdit}
      canDelete={canDelete}
      initialQuery={q ?? ""}
    />
  );
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const { q } = await searchParams;

  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersContent q={q} />
    </Suspense>
  );
}
