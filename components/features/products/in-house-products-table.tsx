"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DeleteProductButton,
} from "@/components/features/products/product-actions";
import { EditProductButton } from "@/components/features/products/edit-product-dialog";
import { LinkProductToServiceButton } from "@/components/features/products/link-product-to-service-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginatedList } from "@/components/ui/table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import {
  clientsLeft,
  clientsPerPack,
  packCostFromUnitCost,
} from "@/lib/products/in-house-math";
import type { Product, ProductCategory } from "@/types";

type ProductRow = Product & {
  category: { id: string; name: string } | null;
  unit_label?: string | null;
  pack_size?: number | null;
  default_usage_qty?: number | null;
};

type ServiceOption = { id: string; name: string; is_active: boolean };

type ServiceLink = { serviceId: string; serviceName: string; quantity: number };

export function InHouseProductsTable({
  products,
  categories,
  services,
  linksByProduct,
  canManage,
}: {
  products: ProductRow[];
  categories: ProductCategory[];
  services: ServiceOption[];
  linksByProduct: Record<string, ServiceLink[]>;
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter((p) => {
      const links = linksByProduct[p.id] ?? [];
      const haystack = [
        p.name,
        p.sku ?? "",
        p.category?.name ?? "",
        p.unit_label ?? "",
        p.is_active ? "active" : "inactive",
        ...links.map((l) => l.serviceName),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [products, linksByProduct, query]);

  return (
    <div className="space-y-3">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, SKU, category, or linked service…"
        className="max-w-sm"
        aria-label="Search in-house products"
      />
      <PaginatedList
        items={filtered}
        empty={
          <p className="text-sm text-muted-foreground">
            {products.length === 0
              ? "No in-house products yet."
              : "No products match your search."}
          </p>
        }
      >
      {(slice) => (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Each bottle</TableHead>
                <TableHead>Use / client</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Stock value</TableHead>
                <TableHead>Linked services</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="min-w-[320px]" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {slice.map((p) => {
                const unit = p.unit_label?.trim() || "";
                const pack = Number(p.pack_size) || 0;
                const useQty = Number(p.default_usage_qty) || 0;
                const stock = Number(p.stock_quantity) || 0;
                const unitCost = Number(p.cost_price) || 0;
                const stockValue = stock * unitCost;
                const packCost = pack > 0 ? packCostFromUnitCost(unitCost, pack) : null;
                const perPack = clientsPerPack(pack, useQty);
                const left = clientsLeft(stock, useQty);
                const links = linksByProduct[p.id] ?? [];

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/in-house/${p.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.sku ? (
                        <div className="text-xs text-muted-foreground">{p.sku}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {pack > 0 ? (
                        <span>
                          {pack} {unit || "units"}
                          {perPack != null ? (
                            <span className="block text-xs text-muted-foreground">
                              ~{perPack} clients / bottle
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Open stock only</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {useQty > 0 ? (
                        `${useQty} ${unit || "units"}`
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          stock <= (Number(p.low_stock_threshold) || 0)
                            ? "font-medium text-destructive"
                            : ""
                        }
                      >
                        {stock}
                        {unit ? ` ${unit}` : ""}
                      </span>
                      {left != null ? (
                        <span className="block text-xs text-muted-foreground">
                          ~{left} clients left
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {packCost != null ? (
                        <>
                          <div>{formatCurrency(packCost)} / bottle</div>
                          <div className="text-xs">
                            {formatCurrency(unitCost)} / {unit || "unit"}
                          </div>
                        </>
                      ) : (
                        <div>
                          {formatCurrency(unitCost)} / {unit || "unit"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(stockValue)}
                    </TableCell>
                    <TableCell>
                      {links.length ? (
                        <div className="flex flex-wrap gap-1">
                          {links.map((l) => (
                            <Badge key={l.serviceId} variant="outline" className="font-normal">
                              {l.serviceName} · {l.quantity}
                              {unit ? ` ${unit}` : ""}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            render={<Link href={`/in-house/${p.id}`} />}
                          >
                            Details
                          </Button>
                          <LinkProductToServiceButton
                            product={p}
                            services={services}
                            linkedServiceIds={links.map((l) => l.serviceId)}
                          />
                          <EditProductButton
                            product={p}
                            categories={categories}
                            catalog="inhouse"
                          />
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
    </div>
  );
}
