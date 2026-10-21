import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  getInHouseProductDetail,
  getProductCategories,
} from "@/lib/actions/products";
import { getActiveServicesForLinking } from "@/lib/actions/services";
import { getCapabilities } from "@/lib/auth/permissions";
import { EditProductButton } from "@/components/features/products/edit-product-dialog";
import { LinkProductToServiceButton } from "@/components/features/products/link-product-to-service-dialog";
import { InventoryAdjustForm } from "@/components/features/products/product-actions";
import { InHouseTransactionsList } from "@/components/features/products/in-house-transactions-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { packCostFromUnitCost } from "@/lib/products/in-house-math";

export default async function InHouseProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [detail, caps, services, categories] = await Promise.all([
    getInHouseProductDetail(id),
    getCapabilities("products"),
    getActiveServicesForLinking(),
    getProductCategories(),
  ]);
  const canEdit = caps.canEdit;

  if (!detail) notFound();

  const { product, linkedServices, transactions, stats } = detail;
  const unit = stats.unitLabel;
  const packCost =
    stats.packSize != null
      ? packCostFromUnitCost(stats.unitCost, stats.packSize)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={product.name}
          description="Remaining stock, auto-deduct usage, and full movement history."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" render={<Link href="/in-house" />}>
            Back to list
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            render={<Link href={`/reports?tab=in_house`} />}
          >
            In-house report
          </Button>
          {canEdit ? (
            <>
              <LinkProductToServiceButton
                product={product}
                services={services}
                linkedServiceIds={linkedServices.map((l) => l.serviceId)}
              />
              <EditProductButton
                product={product as never}
                categories={categories}
                catalog="inhouse"
              />
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-2xl">
              {stats.stockRemaining} {unit}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Value {formatCurrency(stats.stockValue)}
            {stats.clientsLeft != null ? ` · ~${stats.clientsLeft} clients left` : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Used (net)</CardDescription>
            <CardTitle className="text-2xl">
              {stats.netUsed} {unit}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cost of usage {formatCurrency(stats.usageCost)}
            {stats.lifetimeRestored > 0
              ? ` · restored ${stats.lifetimeRestored} ${unit}`
              : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Use per client</CardDescription>
            <CardTitle className="text-2xl">
              {stats.usePerClient != null ? `${stats.usePerClient} ${unit}` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.packSize != null
              ? `1 bottle = ${stats.packSize} ${unit}${
                  packCost != null ? ` · ${formatCurrency(packCost)}/bottle` : ""
                }`
              : "Open stock (no bottle size)"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Auto-deduct at POS</CardDescription>
            <CardTitle className="text-2xl">
              {stats.autoDeduct ? "On" : "Off"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {stats.autoDeduct
              ? `Linked to ${linkedServices.length} service(s) — deducted when sold`
              : "Link to a service and set use per client in Edit"}
          </CardContent>
        </Card>
      </div>

      <Card className="border-teal-200/80 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">How stock moves</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          When a linked service is sold at POS, this product&apos;s use-per-client amount is{" "}
          <strong className="text-foreground">auto-deducted</strong> from remaining stock. Staff can
          change the qty on checkout if needed. Voids / full refunds / amends restore stock.
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Linked services</CardTitle>
            <CardDescription>Recipes that deduct this product at checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            {!linkedServices.length ? (
              <p className="text-sm text-muted-foreground">
                Not linked yet. Use <strong>Link to service</strong> so POS deducts automatically.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {linkedServices.map((l) => (
                  <li
                    key={l.serviceId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="font-medium">{l.serviceName}</span>
                    <Badge variant="outline">
                      {l.quantity} {unit} / sale
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {canEdit ? (
          <Card>
            <CardHeader>
              <CardTitle>Update quantity</CardTitle>
              <CardDescription>
                Stock in adds {unit}; Set on-hand replaces. Prefer Edit → Update quantity for add
                bottles (×{stats.packSize ?? "?"} {unit} each).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryAdjustForm
                products={[
                  {
                    id: product.id,
                    name: `${product.name} (${stats.stockRemaining} ${unit})`,
                    stock_quantity: stats.stockRemaining,
                  },
                ]}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quantity history</CardTitle>
          <CardDescription>
            All stock in, auto-deducts, restores, and manual adjustments for this product.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InHouseTransactionsList
            transactions={transactions}
            unitLabel={unit}
            unitCost={stats.unitCost}
          />
        </CardContent>
      </Card>
    </div>
  );
}
