import { jsonCached, jsonError, resolveCustomerAppRequest } from "@/lib/customer-apps/api";
import { listAppProducts } from "@/lib/customer-apps/domain";

export const revalidate = 60;

/** GET — published app catalog (separate from POS / marketplace). */
export async function GET(request: Request) {
  const ctx = await resolveCustomerAppRequest(request);
  if ("error" in ctx) return jsonError(ctx.error, ctx.status);
  if (!ctx.settings.features.product_catalog) {
    return jsonError("Product catalog feature is disabled", 403);
  }

  const products = await listAppProducts(ctx.app.id, true);
  return jsonCached({
    products: products.map((p) => ({
      id: p.id,
      organizationId: p.organization_id,
      title: p.title,
      name: p.title,
      description: p.description,
      price: p.price,
      retail_price: p.price,
      imageUrl: p.image_url,
      stock_quantity: null,
      product_kind: "app",
      sku: null,
      posProductId: p.pos_product_id,
    })),
  });
}
