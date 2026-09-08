import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSale } from "@/lib/actions/sales";
import {
  getSaleRefundableCash,
  getSaleRefunds,
  getSaleVersions,
} from "@/lib/actions/sales-lifecycle";
import { getSaleStockLedger } from "@/lib/inventory/service-usage";
import { requireOrganization } from "@/lib/auth/organization";
import { canManageRecords, canUsePos } from "@/lib/auth/permissions";
import { isDeletedSaleStatus, isPostedSaleStatus, saleStatusLabel } from "@/lib/sales/lifecycle";
import { VoidSaleButton } from "@/components/features/sales/void-sale-button";
import { RefundSaleButton } from "@/components/features/sales/refund-sale-button";
import { PrintReceiptButton } from "@/components/features/sales/print-receipt-button";
import { InvoiceHistoryPanel } from "@/components/features/sales/invoice-history-panel";
import { ReceivePaymentButton } from "@/components/features/sales/receive-payment-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatCustomerName, formatDateTime } from "@/lib/format";

type SaleDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function SaleDetailPage({ params, searchParams }: SaleDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const [sale, canManage, canPos] = await Promise.all([
    getSale(id),
    canManageRecords(),
    canUsePos(),
  ]);
  if (!sale) notFound();

  const org = await requireOrganization();
  const [stockLedger, refundableCash] = await Promise.all([
    getSaleStockLedger(org.organizationId, id),
    getSaleRefundableCash(id),
  ]);

  const showHistory = tab === "history" && canManage;
  const [versions, refunds] = showHistory
    ? await Promise.all([getSaleVersions(id), getSaleRefunds(id)])
    : [[], []];

  const customer = sale.customer as {
    first_name: string;
    last_name: string | null;
    phone: string | null;
    email: string | null;
  } | null;
  const items = (sale.items ?? []) as {
    id: string;
    name: string;
    item_type: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
  const invoice = sale.invoice as
    | { invoice_number: string; issued_at: string }[]
    | { invoice_number: string; issued_at: string }
    | null;
  const invoiceData = Array.isArray(invoice) ? invoice[0] : invoice;
  const payments = (sale.payments ?? []) as {
    method: string;
    amount: number;
    paid_at: string;
    reference?: string | null;
  }[];
  const saleAny = sale as {
    current_version?: number;
    void_reason?: string | null;
    payment_status?: string;
    amount_paid?: number;
    amount_due?: number;
    amount_refunded?: number;
    payment_version?: number;
    customer_id?: string | null;
  };
  const amountDue = Number(saleAny.amount_due ?? 0);
  const amountPaid = Number(saleAny.amount_paid ?? 0);
  const deleted = isDeletedSaleStatus(sale.status);
  const posted = isPostedSaleStatus(sale.status);
  const canReceive = (canPos || canManage) && posted && amountDue > 0 && !deleted;
  const canRefund = canManage && posted && !deleted && refundableCash > 0;
  const paymentStatus = saleAny.payment_status ?? "PAID";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={invoiceData?.invoice_number ?? "Sale"}
        description={`Sale details and invoice${
          saleAny.current_version && saleAny.current_version > 1
            ? ` · Version ${saleAny.current_version}`
            : ""
        }${deleted ? " · Soft-deleted (disabled)" : ""}`}
        actions={
          <>
            {canReceive ? (
              <ReceivePaymentButton
                saleId={sale.id}
                amountDue={amountDue}
                paymentVersion={Number(saleAny.payment_version ?? 1)}
                invoiceLabel={invoiceData?.invoice_number}
              />
            ) : null}
            {canManage && posted && !deleted ? (
              <Button variant="outline" render={<Link href={`/sales/${id}/edit`} />}>
                Edit
              </Button>
            ) : null}
            {canManage ? (
              <Button
                variant={showHistory ? "default" : "outline"}
                render={<Link href={showHistory ? `/sales/${id}` : `/sales/${id}?tab=history`} />}
              >
                {showHistory ? "Details" : "History"}
              </Button>
            ) : null}
            <Button variant="outline" render={<Link href="/sales" />}>
              Back
            </Button>
          </>
        }
      />

      {deleted ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">Deleted invoice — disabled</p>
          <p className="mt-1 text-muted-foreground">
            Soft-deleted. Excluded from revenue. Retail stock restored; in-house usage kept
            deducted (already used)
            {saleAny.void_reason ? ` · Reason: ${saleAny.void_reason}` : ""}.
          </p>
        </div>
      ) : null}

      {sale.status === "REFUNDED" ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50/70 px-4 py-3 text-sm dark:border-teal-900/50 dark:bg-teal-950/30">
          <p className="font-medium text-teal-900 dark:text-teal-100">Fully refunded</p>
          <p className="mt-1 text-muted-foreground">
            Money returned. Retail stock restored. In-house usage kept deducted (already used) and
            counted as write-off cost. Invoice stays for owner history.
          </p>
        </div>
      ) : null}

      {paymentStatus === "PARTIALLY_REFUNDED" && posted ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="font-medium text-amber-950 dark:text-amber-100">Partial refund on file</p>
          <p className="mt-1 text-muted-foreground">
            Money adjusted only — retail and in-house stock stay deducted.
          </p>
        </div>
      ) : null}

      {showHistory ? (
        <InvoiceHistoryPanel
          versions={versions ?? []}
          refunds={refunds ?? []}
          stockMovements={stockLedger.movements}
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Summary</CardTitle>
                <div className="flex gap-2">
                  <Badge
                    variant={
                      deleted
                        ? "destructive"
                        : posted
                          ? "default"
                          : "secondary"
                    }
                  >
                    {saleStatusLabel(sale.status)}
                  </Badge>
                  {deleted ? (
                    <Badge variant="outline">Disabled</Badge>
                  ) : (
                    <Badge
                      variant={
                        paymentStatus === "PAID"
                          ? "default"
                          : paymentStatus === "UNPAID"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {paymentStatus.replaceAll("_", " ")}
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                {sale.completed_at && `Completed ${formatDateTime(sale.completed_at)}`}
                {saleAny.void_reason
                  ? ` · ${deleted ? "Deleted" : "Void"}: ${saleAny.void_reason}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {customer && (
                <p>
                  <span className="text-muted-foreground">Customer:</span>{" "}
                  {sale.customer_id ? (
                    <Link
                      href={`/customers/${sale.customer_id}`}
                      className="text-primary hover:underline"
                    >
                      {formatCustomerName(customer.first_name, customer.last_name)}
                    </Link>
                  ) : (
                    formatCustomerName(customer.first_name, customer.last_name)
                  )}
                  {customer.phone && ` · ${customer.phone}`}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Subtotal:</span>{" "}
                {formatCurrency(sale.subtotal)}
              </p>
              {Number(sale.discount) > 0 && (
                <p>
                  <span className="text-muted-foreground">Discount:</span> -
                  {formatCurrency(sale.discount)}
                </p>
              )}
              {Number(sale.tax ?? 0) > 0 && (
                <p>
                  <span className="text-muted-foreground">Tax:</span> +
                  {formatCurrency(sale.tax ?? 0)}
                </p>
              )}
              <p className="text-lg font-semibold">
                Invoice total: {formatCurrency(sale.total)}
              </p>
            </CardContent>
          </Card>

          {(stockLedger.usageHasAny || stockLedger.retailHasAny) && (
            <Card>
              <CardHeader>
                <CardTitle>Stock impact</CardTitle>
                <CardDescription>{stockLedger.stockStatusLabel}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stockLedger.usageLines.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">In-house usage (not billed to customer)</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Used</TableHead>
                          <TableHead className="text-right">Still out</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockLedger.usageLines.map((u) => (
                          <TableRow key={u.productId}>
                            <TableCell>
                              <Link
                                href={`/in-house/${u.productId}`}
                                className="text-primary underline-offset-2 hover:underline"
                              >
                                {u.productName}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right">
                              {u.quantity}
                              {u.unitLabel ? ` ${u.unitLabel}` : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {u.outstandingQty}
                              {u.unitLabel ? ` ${u.unitLabel}` : ""}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(u.quantity * u.unitCost)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  u.stockStatus === "restored"
                                    ? "secondary"
                                    : u.stockStatus === "partial"
                                      ? "outline"
                                      : "default"
                                }
                              >
                                {u.stockStatus === "restored"
                                  ? "Restored"
                                  : u.stockStatus === "partial"
                                    ? "Partially out"
                                    : "Deducted"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground">
                      In-house cream/ml is never billed to the customer. On delete or full refund it
                      stays deducted (already used); only retail products return to stock. Restock
                      manually under In-house if the service never happened.
                    </p>
                  </div>
                ) : null}

                {stockLedger.retailHasAny ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Retail products</p>
                    {stockLedger.retailOutstanding.length ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {stockLedger.retailOutstanding.map((r) => (
                          <li key={r.productId}>
                            {r.productName}:{" "}
                            <span className="font-medium text-foreground">{r.quantity}</span> still
                            out
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Retail stock for this invoice has been restored.
                      </p>
                    )}
                  </div>
                ) : null}

                {canManage ? (
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/sales/${id}?tab=history`} />}
                  >
                    View full stock timeline
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice total</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
              {Number(saleAny.amount_refunded ?? 0) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refunded</span>
                  <span>-{formatCurrency(saleAny.amount_refunded ?? 0)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-border pt-2 font-semibold">
                <span>Due</span>
                <span className={amountDue > 0 ? "text-amber-700 dark:text-amber-400" : ""}>
                  {formatCurrency(amountDue)}
                </span>
              </div>
              {canRefund ? (
                <p className="text-xs text-muted-foreground pt-1">
                  Refundable cash/card now: {formatCurrency(refundableCash)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Line items</CardTitle>
              <CardDescription>
                Customer bill — services, packages, and retail only. In-house cream/ml is never a
                line here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.item_type}</Badge>
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.line_total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{formatDateTime(p.paid_at)}</TableCell>
                        <TableCell>{p.method}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.reference ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(p.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2">
            <PrintReceiptButton saleId={sale.id} />
            {canReceive ? (
              <ReceivePaymentButton
                saleId={sale.id}
                amountDue={amountDue}
                paymentVersion={Number(saleAny.payment_version ?? 1)}
                invoiceLabel={invoiceData?.invoice_number}
              />
            ) : null}
            {canRefund ? (
              <RefundSaleButton saleId={sale.id} refundableMax={refundableCash} />
            ) : null}
            {canManage && posted && !deleted ? (
              <>
                <Button variant="outline" render={<Link href={`/sales/${sale.id}/edit`} />}>
                  Edit / Amend
                </Button>
                <VoidSaleButton saleId={sale.id} />
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
