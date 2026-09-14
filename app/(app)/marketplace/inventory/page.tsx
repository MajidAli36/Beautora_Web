import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerProducts } from "@/lib/marketplace/actions";
import { InventoryAdjustForm } from "@/components/marketplace/inventory-adjust-form";
import { redirect } from "next/navigation";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MarketplaceInventoryPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const products = await listSellerProducts();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace inventory"
        description="Online shop stock only — never mixed with Salon Management in-house or POS inventory."
      />
      <ul className="divide-y rounded-lg border">
        {products.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">No products.</li>
        ) : (
          products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(p.price))} · status {p.status}
                </p>
              </div>
              <InventoryAdjustForm productId={p.id} stock={p.stock} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
