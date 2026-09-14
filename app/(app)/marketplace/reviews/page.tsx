import { PageHeader } from "@/components/layout/page-header";
import { getMyMarketplaceSeller, listSellerReviews } from "@/lib/marketplace/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MarketplaceReviewsPage() {
  const seller = await getMyMarketplaceSeller();
  if (!seller) redirect("/marketplace");
  const reviews = await listSellerReviews();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product reviews"
        description="Shopper feedback on your Marketplace listings. Platform admin can hide abusive reviews."
      />
      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {r.product_title} · {r.rating}/5
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {r.reviewer_name}
                  {r.is_hidden ? " · hidden" : ""}
                </p>
              </CardHeader>
              {r.comment ? (
                <CardContent>
                  <p className="text-sm text-muted-foreground">{r.comment}</p>
                </CardContent>
              ) : null}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
