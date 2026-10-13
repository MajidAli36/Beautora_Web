import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";
import {
  getInHouseProducts,
  getInventoryTransactions,
  getProductCategories,
} from "@/lib/actions/products";
import {
  getActiveServicesForLinking,
  getServiceLinksByProduct,
} from "@/lib/actions/services";
import { getCapabilities } from "@/lib/auth/permissions";
import { InventoryAdjustForm } from "@/components/features/products/product-actions";
import { InHouseProductForm } from "@/components/features/products/in-house-product-form";
import { InHouseProductsTable } from "@/components/features/products/in-house-products-table";
import { ProductCategoryForm } from "@/components/features/products/product-forms";
import {
  InventoryTransactionsTable,
  ProductCategoriesTable,
} from "@/components/features/products/products-lists";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InHousePage() {
  const [categories, products, transactions, caps, services, linksMap] = await Promise.all([
    getProductCategories(),
    getInHouseProducts(),
    getInventoryTransactions(50),
    getCapabilities("products"),
    getActiveServicesForLinking(),
    getServiceLinksByProduct(),
  ]);
  const canManage = caps.canManage;
  const canCreate = caps.canCreate;
  const canEdit = caps.canEdit;

  const usageTxns = (transactions ?? []).filter((t) =>
    String((t as { reference_type?: string | null }).reference_type ?? "").startsWith(
      "service_usage"
    )
  );

  const linksByProduct: Record<
    string,
    { serviceId: string; serviceName: string; quantity: number }[]
  > = {};
  for (const [productId, links] of linksMap.entries()) {
    linksByProduct[productId] = links;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="In-house stock"
          description="Back-bar cream, wax, spray. Track by pack or total quantity, then link to services."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" render={<Link href="/services" />}>
            Services
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            render={<Link href="/reports?tab=in_house" />}
          >
            In-house report
          </Button>
        </div>
      </div>

      <Card className="border-teal-200/80 bg-teal-50/40 dark:border-teal-900/40 dark:bg-teal-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Easy setup</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="font-medium">1 · Bottles</p>
            <p className="mt-1 text-muted-foreground">
              <strong className="text-foreground">50</strong> bottles ×{" "}
              <strong className="text-foreground">100 ml</strong> each · paid{" "}
              <strong className="text-foreground">Rs 5,000</strong> → 5,000 ml stock value Rs 5,000.
            </p>
          </div>
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="font-medium">2 · Use per client</p>
            <p className="mt-1 text-muted-foreground">
              Pick <strong className="text-foreground">5 ml</strong> or{" "}
              <strong className="text-foreground">10 ml</strong> (or other). 100 ml bottle ÷ 10 ml =
              ~10 clients per bottle.
            </p>
          </div>
          <div className="rounded-lg border bg-background/80 p-3">
            <p className="font-medium">3 · Link service</p>
            <p className="mt-1 text-muted-foreground">
              <strong className="text-foreground">Link to service</strong> uses that locked use/client.
              Change use amount only in Edit.
            </p>
          </div>
        </CardContent>
      </Card>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Add in-house product</CardTitle>
            <CardDescription>
              Bottles: how many × ml in each + use per client (5 or 10 ml…). Or open stock / pieces.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InHouseProductForm categories={categories} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>In-house stock</CardTitle>
          <CardDescription>
            Stock value = quantity × cost per unit. Fix wrong values by editing cost of 1 pack.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InHouseProductsTable
            products={products as never}
            categories={categories}
            services={services}
            linksByProduct={linksByProduct}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Restock / adjust</CardTitle>
            <CardDescription>
              Add stock in the same unit (e.g. +50 ml for one new 50 ml tube). Decimals allowed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InventoryAdjustForm
              products={products.map((p) => {
                const row = p as {
                  id: string;
                  name: string;
                  stock_quantity?: number;
                  unit_label?: string | null;
                  pack_size?: number | null;
                };
                const unit = row.unit_label?.trim();
                const pack = Number(row.pack_size) || 0;
                const label =
                  unit && pack > 0
                    ? `${row.name} (${row.stock_quantity ?? 0} ${unit} on hand · 1 pack = ${pack} ${unit})`
                    : unit
                      ? `${row.name} (${row.stock_quantity ?? 0} ${unit} on hand)`
                      : `${row.name} (stock: ${row.stock_quantity ?? 0})`;
                return {
                  id: row.id,
                  name: label,
                  stock_quantity: Number(row.stock_quantity) || 0,
                };
              })}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent service usage</CardTitle>
          <CardDescription>
            Deductions and restores from POS, amendments, voids, and full refunds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InventoryTransactionsTable transactions={usageTxns.length ? usageTxns : transactions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Organize in-house stock (e.g. Creams, Wax, Sprays). Same category list as Products —
            pick one when adding or editing an in-house item.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {canManage && (
            <div>
              <p className="mb-2 text-sm font-medium">Add category</p>
              <ProductCategoryForm />
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">
              All categories ({categories.length})
            </p>
            <ProductCategoriesTable categories={categories} canManage={canManage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
