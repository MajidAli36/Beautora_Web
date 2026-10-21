"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyMarketplaceSeller } from "@/lib/marketplace/actions";
import { slugify } from "@/lib/marketplace/constants";
import {
  deleteMarketplaceMediaPath,
  uploadMarketplaceMediaFile,
} from "@/lib/storage/marketplace-media";
import {
  MARKETPLACE_PRODUCT_MAX_IMAGES,
  MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES,
  MARKETPLACE_PRODUCT_MIN_IMAGES,
} from "@/lib/marketplace/media-limits";
import type { ActionResult } from "@/types/commerce";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function upsertSellerProductWithMedia(
  formData: FormData
): Promise<ActionResult & { productId?: string }> {
  const seller = await getMyMarketplaceSeller();
  if (!seller) return { error: "Register as a seller first." };
  if (seller.status === "suspended") return { error: "Seller account is suspended." };

  const title = String(formData.get("title") ?? "").trim();
  const descriptionHtml = String(formData.get("description_html") ?? "").trim() || null;
  const shortDescription = String(formData.get("short_description") ?? "").trim() || null;
  const categoryId = String(formData.get("category_id") ?? "").trim() || null;
  const price = Number(formData.get("price") ?? 0);
  const salePriceRaw = String(formData.get("sale_price") ?? "").trim();
  const costPriceRaw = String(formData.get("cost_price") ?? "").trim();
  const stock = Math.max(0, Math.floor(Number(formData.get("stock") ?? 0)));
  const lowStock = Math.max(0, Math.floor(Number(formData.get("low_stock_threshold") ?? 0)));
  const sku = String(formData.get("sku") ?? "").trim() || null;
  const seoTitle = String(formData.get("seo_title") ?? "").trim() || null;
  const seoDescription = String(formData.get("seo_description") ?? "").trim() || null;
  const intent = String(formData.get("intent") ?? formData.get("submit_for_review") ?? "0");
  const submitForReview = intent === "1";

  if (title.length < 2) return { error: "Title is required." };

  const { validateMarketplacePricing } = await import("@/lib/marketplace/pricing");
  const pricing = validateMarketplacePricing({
    costPrice: costPriceRaw === "" ? 0 : Number(costPriceRaw),
    sellingPrice: price,
    discountPrice: salePriceRaw === "" ? null : Number(salePriceRaw),
  });
  if (!pricing.ok) return { error: pricing.error };
  const { costPrice, sellingPrice, discountPrice: salePrice } = pricing;

  const imageFiles: File[] = [];
  const count = Math.min(
    MARKETPLACE_PRODUCT_MAX_IMAGES,
    Math.max(0, Math.floor(Number(formData.get("image_count") ?? 0)))
  );
  for (let i = 0; i < count; i++) {
    const f = formData.get(`image_${i}`);
    if (f instanceof File && f.size > 0) imageFiles.push(f);
  }
  // Also accept multiple under same name
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("image_") && val instanceof File && val.size > 0) {
      if (!imageFiles.includes(val)) imageFiles.push(val);
    }
  }
  const uniqueImages = imageFiles.slice(0, MARKETPLACE_PRODUCT_MAX_IMAGES);

  if (uniqueImages.length < MARKETPLACE_PRODUCT_MIN_IMAGES) {
    return { error: `Add at least ${MARKETPLACE_PRODUCT_MIN_IMAGES} product image.` };
  }

  const productVideo = formData.get("product_video");
  const reelVideo = formData.get("reel_video");
  const productVideoFile =
    productVideo instanceof File && productVideo.size > 0 ? productVideo : null;
  const reelVideoFile = reelVideo instanceof File && reelVideo.size > 0 ? reelVideo : null;

  let plannedBytes = uniqueImages.reduce((s, f) => s + f.size, 0);
  if (productVideoFile) plannedBytes += productVideoFile.size;
  if (reelVideoFile) plannedBytes += reelVideoFile.size;

  if (plannedBytes > MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES) {
    return {
      error: `Total media is ${(plannedBytes / (1024 * 1024)).toFixed(1)} MB — maximum is 100 MB per product.`,
    };
  }

  const admin = createAdminClient();
  const slug = slugify(title);
  // Auto-publish on submit — no platform wait for marketplace listings.
  const status = submitForReview ? "published" : "draft";
  const plain = descriptionHtml ? stripHtml(descriptionHtml) : null;

  const { data: product, error: insertErr } = await admin
    .from("marketplace_products")
    .insert({
      seller_id: seller.id,
      title,
      slug,
      description: plain,
      description_html: descriptionHtml,
      short_description: shortDescription,
      category_id: categoryId,
      price: sellingPrice,
      sale_price: salePrice,
      cost_price: costPrice,
      stock,
      low_stock_threshold: lowStock,
      sku,
      seo_title: seoTitle,
      seo_description: seoDescription,
      status,
      media_bytes_total: 0,
    })
    .select("id")
    .single();

  if (insertErr || !product) {
    // Column may not exist until migration — retry without new columns
    if (insertErr?.message?.includes("description_html") || insertErr?.message?.includes("media_bytes")) {
      const { data: fallback, error: fbErr } = await admin
        .from("marketplace_products")
        .insert({
          seller_id: seller.id,
          title,
          slug,
          description: plain || descriptionHtml,
          short_description: shortDescription,
          category_id: categoryId,
          price: sellingPrice,
          sale_price: salePrice,
          cost_price: costPrice,
          stock,
          sku,
          seo_title: seoTitle,
          seo_description: seoDescription,
          status,
        })
        .select("id")
        .single();
      if (fbErr || !fallback) return { error: fbErr?.message ?? insertErr.message };
      return finishMedia(seller.id, fallback.id, uniqueImages, productVideoFile, reelVideoFile, status);
    }
    return { error: insertErr?.message ?? "Could not create product." };
  }

  return finishMedia(
    seller.id,
    product.id,
    uniqueImages,
    productVideoFile,
    reelVideoFile,
    status
  );
}

async function finishMedia(
  sellerId: string,
  productId: string,
  images: File[],
  productVideo: File | null,
  reelVideo: File | null,
  status: string
): Promise<ActionResult & { productId?: string }> {
  const admin = createAdminClient();
  let used = 0;
  const uploadedPaths: string[] = [];
  let coverUrl: string | null = null;

  try {
    for (let i = 0; i < images.length; i++) {
      const up = await uploadMarketplaceMediaFile({
        sellerId,
        productId,
        file: images[i],
        kind: "image",
        remainingBudgetBytes: MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES - used,
      });
      if (up.error || !up.data) {
        throw new Error(up.error ?? "Image upload failed");
      }
      used += up.data.byteSize;
      uploadedPaths.push(up.data.path);
      if (i === 0) coverUrl = up.data.url;

      await admin.from("marketplace_product_images").insert({
        product_id: productId,
        url: up.data.url,
        storage_path: up.data.path,
        byte_size: up.data.byteSize,
        sort_order: i,
      });
    }

    let videoUrl: string | null = null;
    let videoPath: string | null = null;
    if (productVideo) {
      const up = await uploadMarketplaceMediaFile({
        sellerId,
        productId,
        file: productVideo,
        kind: "video",
        remainingBudgetBytes: MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES - used,
      });
      if (up.error || !up.data) throw new Error(up.error ?? "Video upload failed");
      used += up.data.byteSize;
      uploadedPaths.push(up.data.path);
      videoUrl = up.data.url;
      videoPath = up.data.path;
    }

    let reelUrl: string | null = null;
    let reelPath: string | null = null;
    if (reelVideo) {
      const up = await uploadMarketplaceMediaFile({
        sellerId,
        productId,
        file: reelVideo,
        kind: "reel",
        remainingBudgetBytes: MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES - used,
      });
      if (up.error || !up.data) throw new Error(up.error ?? "Reel upload failed");
      used += up.data.byteSize;
      uploadedPaths.push(up.data.path);
      reelUrl = up.data.url;
      reelPath = up.data.path;
    }

    if (used > MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES) {
      throw new Error("Total media exceeds the 100 MB product limit.");
    }

    await admin
      .from("marketplace_products")
      .update({
        image_url: coverUrl,
        video_url: videoUrl,
        video_path: videoPath,
        reel_video_url: reelUrl,
        reel_video_path: reelPath,
        media_bytes_total: used,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    revalidatePath("/marketplace/products");
    revalidatePath("/marketplace/inventory");
    revalidatePath("/shop");
    revalidatePath("/videos");
    revalidatePath("/discover");

    return {
      success: true,
      productId,
      message:
        status === "published"
          ? "Product published to the marketplace."
          : "Draft saved with media.",
    };
  } catch (err) {
    for (const p of uploadedPaths) await deleteMarketplaceMediaPath(p);
    await admin.from("marketplace_products").delete().eq("id", productId);
    return {
      error: err instanceof Error ? err.message : "Media upload failed.",
    };
  }
}
