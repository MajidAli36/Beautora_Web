"use client";

import {
  DeleteProductButton,
  DeleteProductCategoryButton,
} from "@/components/features/products/product-actions";
import { EditProductButton } from "@/components/features/products/edit-product-dialog";
import { Badge } from "@/components/ui/badge";
import { PaginatedList } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { getProductValuation, getTransactionValue } from "@/lib/inventory/valuation";
import { productKindLabel } from "@/lib/products/kinds";
import type { Product, ProductCategory } from "@/types";

type ProductRow = Product & { category: { id: string; name: string } | null };

type TransactionRow = {
  id: string;
  type: string;
  quantity: number;
  reference_type?: string | null;
  created_at: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    cost_price: number;
    retail_price: number;
  } | null;
};

function inventoryMovementLabel(type: string, referenceType?: string | null) {
  if (referenceType === "service_usage" || referenceType === "service_usage_amend") {
    return "Service usage";
  }
  if (
    referenceType === "service_usage_void" ||
    referenceType === "service_usage_amend_reverse" ||
    referenceType === "service_usage_restore"
  ) {
    return "Usage restore";
  }
  if (referenceType === "sale" || referenceType === "sale_amend") return "Sale";
  if (referenceType === "sale_void" || referenceType === "sale_amend_reverse") {
    return "Sale restore";
  }
  if (referenceType === "sale_refund_full") return "Refund restore";
  if (referenceType === "manual") return "Manual";
  return type;
}

export function ProductsTable({
  products,
  categories,
  canManage,
}: {
  products: ProductRow[];
  categories: ProductCategory[];
  canManage: boolean;
}) {
  return (
    <PaginatedList
      items={products}
      empty={<p className="text-sm text-muted-foreground">No products yet.</p>}
    >
      {(slice) => (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Retail</TableHead>
                <TableHead className="text-right">Margin</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Stock value</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="min-w-[160px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((p) => {
                const v = getProductValuation(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{productKindLabel(p.product_kind)}</Badge>
                    </TableCell>
                    <TableCell>{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(v.costPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(v.retailPrice)}
                    </TableCell>
                    <TableCell className="text-right text-green-700">
                      {formatCurrency(v.unitMargin)}
                      {v.marginPercent > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({v.marginPercent}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          p.stock_quantity <= p.low_stock_threshold
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {v.stock}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(v.stockValueAtCost)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <EditProductButton product={p} categories={categories} />
                          <DeleteProductButton id={p.id} name={p.name} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PaginatedList>
  );
}

export function ProductCategoriesTable({
  categories,
  canManage,
}: {
  categories: ProductCategory[];
  canManage: boolean;
}) {
  return (
    <PaginatedList
      items={categories}
      empty={<p className="text-sm text-muted-foreground">No categories yet.</p>}
    >
      {(slice) => (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Order</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.sort_order}</TableCell>
                  {canManage && (
                    <TableCell>
                      <DeleteProductCategoryButton id={c.id} name={c.name} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PaginatedList>
  );
}

export function InventoryValuationTable({ products }: { products: ProductRow[] }) {
  return (
    <PaginatedList
      items={products}
      empty={<p className="text-sm text-muted-foreground">No products yet.</p>}
    >
      {(slice) => (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">At cost</TableHead>
                <TableHead className="text-right">At retail</TableHead>
                <TableHead className="text-right">Potential profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((p) => {
                const v = getProductValuation(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{v.stock}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(v.stockValueAtCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(v.stockValueAtRetail)}
                    </TableCell>
                    <TableCell className="text-right text-green-700">
                      {formatCurrency(v.potentialProfit)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PaginatedList>
  );
}

export function InventoryTransactionsTable({
  transactions,
}: {
  transactions: TransactionRow[];
}) {
  return (
    <PaginatedList
      items={transactions}
      empty={<p className="text-sm text-muted-foreground">No transactions yet.</p>}
    >
      {(slice) => (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Value (cost)</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((t) => {
                const cost = t.product?.cost_price ?? 0;
                const value = getTransactionValue(
                  t.quantity,
                  cost,
                  t.type as "IN" | "OUT" | "ADJUSTMENT"
                );
                return (
                  <TableRow key={t.id}>
                    <TableCell>{t.product?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.type === "IN"
                            ? "default"
                            : t.type === "OUT"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {inventoryMovementLabel(t.type, t.reference_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {t.type === "ADJUSTMENT"
                        ? "—"
                        : `${t.type === "OUT" ? "−" : "+"}${formatCurrency(value)}`}
                    </TableCell>
                    <TableCell>{formatDateTime(t.created_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </PaginatedList>
  );
}
