import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/actions/customers";
import { getCustomerStatement } from "@/lib/actions/payments";
import { canManageRecords } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { formatCurrency, formatCustomerName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerStatementControls } from "@/components/features/customers/customer-statement-controls";
import { CustomerStatementLines } from "@/components/features/customers/customer-statement-lines";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function CustomerStatementPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { from, to } = await searchParams;
  const canManage = await canManageRecords();
  if (!canManage) redirect(`/customers/${id}`);

  const customer = await getCustomer(id);
  if (!customer) notFound();

  const statement = await getCustomerStatement(id, from, to);
  const name = formatCustomerName(customer.first_name, customer.last_name);

  const csv = [
    ["Date", "Reference", "Description", "Debit", "Credit", "Balance"],
    ...statement.lines.map((l) => [
      l.date,
      l.reference,
      l.description,
      String(l.debit),
      String(l.credit),
      String(l.balance),
    ]),
  ]
    .map((row) => row.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return (
    <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
      <PageHeader
        title="Customer statement"
        description={name}
        className="print:hidden"
        actions={
          <>
            <CustomerStatementControls
              csv={csv}
              filename={`${name.replace(/\s+/g, "-")}-statement.csv`}
            />
            <Button variant="outline" render={<Link href={`/customers/${id}`} />}>
              Back
            </Button>
          </>
        }
      />

      <Card className="print:border-0 print:shadow-none">
        <CardHeader>
          <CardTitle className="text-base">
            {name}
            {from || to ? ` · ${from ?? "…"} → ${to ?? "…"}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <p>
              <span className="text-muted-foreground">Opening balance: </span>
              {formatCurrency(statement.openingBalance)}
            </p>
            <p>
              <span className="text-muted-foreground">Closing balance: </span>
              <span className="font-semibold">{formatCurrency(statement.closingBalance)}</span>
            </p>
          </div>
          <CustomerStatementLines lines={statement.lines} />
        </CardContent>
      </Card>
    </div>
  );
}
