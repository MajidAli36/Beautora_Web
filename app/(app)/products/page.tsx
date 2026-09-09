import { PageHeader } from "@/components/layout/page-header";
import {
  getInventorySummaryStats,
  getInventoryTransactions,
  getProductCategories,
  getRetailProducts,
} from "@/lib/actions/products";
import { getCapabilities } from "@/lib/auth/permissions";
import { InventoryAdjustForm } from "@/components/features/products/product-actions";
import { InventorySummaryCards } from "@/components/features/products/inventory-summary";
import { ProductCategoryForm, ProductForm } from "@/components/features/products/product-forms";
import {
  InventoryTransactionsTable,
  InventoryValuationTable,
  ProductCategoriesTable,
  ProductsTable,
} from "@/components/features/products/products-lists";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ProductsPage() {
  const [categories, products, transactions, inventorySummary, caps] = await Promise.all([
    getProductCategories(),
    getRetailProducts(),
    getInventoryTransactions(),
    getInventorySummaryStats(),
    getCapabilities("products"),
  ]);
  const canManage = caps.canManage;
  const canCreate = caps.canCreate;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Items you sell to customers at POS. Back-bar cream, wax, and sprays live under In-house."
      />

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
          <TabsTrigger value="categories">Categories ({categories.length})</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          {canCreate && (
            <Card>
              <CardHeader>
                <CardTitle>Add product</CardTitle>
                <CardDescription>
                  For sale to customers. Cost = what you pay; retail = POS price. Use In-house for
                  service-only stock.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductForm categories={categories} />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Sellable products</CardTitle>
              <CardDescription>
                &quot;Stock value&quot; = current stock × cost price. POS uses retail price.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProductsTable
                products={products}
                categories={categories}
                canManage={canManage}
                catalog="retail"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          {canCreate && (
            <Card>
              <CardHeader>
                <CardTitle>Add category</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductCategoryForm />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductCategoriesTable categories={categories} canManage={canManage} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventorySummaryCards summary={inventorySummary} />

          {caps.canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Adjust stock</CardTitle>
                <CardDescription>
                  Stock In adds units, Stock Out removes, Adjustment sets exact count. Value uses
                  current cost price × quantity.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryAdjustForm products={products} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Stock valuation by product</CardTitle>
            </CardHeader>
            <CardContent>
              <InventoryValuationTable products={products} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>
                POS sales auto-record Stock Out. Value column = qty × cost price at time of view.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryTransactionsTable transactions={transactions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
