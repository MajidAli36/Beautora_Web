"use client";

import { useMemo, useState, useTransition } from "react";
import { ImagePlus, Film, Clapperboard, Trash2, Upload } from "lucide-react";
import {
  MARKETPLACE_PRODUCT_MAX_IMAGES,
  MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES,
  MARKETPLACE_PRODUCT_MIN_IMAGES,
} from "@/lib/marketplace/media-limits";
import { upsertSellerProductWithMedia } from "@/lib/marketplace/product-media-actions";
import { MarketplaceRichTextEditor } from "@/components/marketplace/rich-text-editor";
import { MarketplaceCategoryPicker } from "@/components/marketplace/category-picker";
import type { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { priceFieldLabel } from "@/lib/currency/labels";

type Category = Database["public"]["Tables"]["marketplace_categories"]["Row"];

type LocalFile = { id: string; file: File; preview: string };

function formatMb(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SellerProductStudio({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [images, setImages] = useState<LocalFile[]>([]);
  const [productVideo, setProductVideo] = useState<LocalFile | null>(null);
  const [reelVideo, setReelVideo] = useState<LocalFile | null>(null);

  const usedBytes = useMemo(() => {
    let n = images.reduce((s, i) => s + i.file.size, 0);
    if (productVideo) n += productVideo.file.size;
    if (reelVideo) n += reelVideo.file.size;
    return n;
  }, [images, productVideo, reelVideo]);

  const remaining = MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES - usedBytes;
  const overBudget = usedBytes > MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES;

  function addImages(list: FileList | null) {
    if (!list?.length) return;
    const next = [...images];
    for (const file of Array.from(list)) {
      if (next.length >= MARKETPLACE_PRODUCT_MAX_IMAGES) break;
      if (!file.type.startsWith("image/")) {
        notify.error("Only image files for the gallery.");
        continue;
      }
      next.push({
        id: `${file.name}-${file.size}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setImages(next.slice(0, MARKETPLACE_PRODUCT_MAX_IMAGES));
  }

  function setVideo(
    kind: "product" | "reel",
    list: FileList | null
  ) {
    const file = list?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      notify.error("Only video files allowed.");
      return;
    }
    const item = {
      id: `${file.name}-${file.size}`,
      file,
      preview: URL.createObjectURL(file),
    };
    if (kind === "product") setProductVideo(item);
    else setReelVideo(item);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (images.length < MARKETPLACE_PRODUCT_MIN_IMAGES) {
      notify.error(`Add at least ${MARKETPLACE_PRODUCT_MIN_IMAGES} product image.`);
      return;
    }
    if (images.length > MARKETPLACE_PRODUCT_MAX_IMAGES) {
      notify.error(`Maximum ${MARKETPLACE_PRODUCT_MAX_IMAGES} images.`);
      return;
    }
    if (overBudget) {
      notify.error("Total media must stay within 100 MB.");
      return;
    }

    const form = e.currentTarget;
    const fd = new FormData(form);
    images.forEach((img, i) => fd.append(`image_${i}`, img.file));
    fd.set("image_count", String(images.length));
    if (productVideo) fd.set("product_video", productVideo.file);
    if (reelVideo) fd.set("reel_video", reelVideo.file);

    startTransition(async () => {
      const res = await upsertSellerProductWithMedia(fd);
      if (res.error) {
        notify.error(res.error);
        return;
      }
      notify.success(res.message ?? "Product saved.");
      form.reset();
      setImages([]);
      setProductVideo(null);
      setReelVideo(null);
    });
  }

  return (
    <Card className="overflow-hidden border-primary/15 shadow-sm">
      <CardHeader className="space-y-2 bg-gradient-to-br from-primary/[0.06] to-transparent pb-6">
        <CardTitle className="font-display text-2xl tracking-tight">Product studio</CardTitle>
        <CardDescription className="max-w-2xl text-base">
          Build a marketplace listing with {MARKETPLACE_PRODUCT_MIN_IMAGES}–
          {MARKETPLACE_PRODUCT_MAX_IMAGES} images, one product video, and one TikTok-style reel.
          Total media cap: <strong>100 MB</strong> (hard limit).
        </CardDescription>
        <div className="pt-2">
          <div className="mb-1 flex justify-between text-xs text-muted-foreground">
            <span>Media budget</span>
            <span className={cn(overBudget && "font-semibold text-destructive")}>
              {formatMb(usedBytes)} / 100 MB
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                overBudget ? "bg-destructive" : "bg-primary"
              )}
              style={{
                width: `${Math.min(100, (usedBytes / MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES) * 100)}%`,
              }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-8">
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required className="h-11 text-base" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">{priceFieldLabel("Price")}</Label>
              <Input id="price" name="price" type="number" min={0} step="0.01" required defaultValue={0} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale_price">Sale price (optional)</Label>
              <Input id="sale_price" name="sale_price" type="number" min={0} step="0.01" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Stock / inventory</Label>
              <Input id="stock" name="stock" type="number" min={0} step={1} required defaultValue={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="low_stock_threshold">Low-stock alert</Label>
              <Input
                id="low_stock_threshold"
                name="low_stock_threshold"
                type="number"
                min={0}
                step={1}
                defaultValue={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU (optional)</Label>
              <Input id="sku" name="sku" />
            </div>
            <MarketplaceCategoryPicker categories={categories} />
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="short_description">Short blurb</Label>
              <Input id="short_description" name="short_description" maxLength={160} />
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <Label>Description</Label>
              <p className="text-xs text-muted-foreground">
                Rich editor — bold, lists, and links for a next-level PDP.
              </p>
            </div>
            <MarketplaceRichTextEditor name="description_html" />
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="inline-flex items-center gap-2">
                  <ImagePlus className="size-4" /> Gallery images
                </Label>
                <p className="text-xs text-muted-foreground">
                  Required: {MARKETPLACE_PRODUCT_MIN_IMAGES}–{MARKETPLACE_PRODUCT_MAX_IMAGES} images
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted">
                <Upload className="size-4" />
                Add images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addImages(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {images.map((img, idx) => (
                <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt="" className="size-full object-cover" />
                  <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 text-[10px] text-white">
                    {idx + 1}
                  </span>
                  <button
                    type="button"
                    className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                    onClick={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                    aria-label="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
              {images.length < MARKETPLACE_PRODUCT_MAX_IMAGES ? (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/50">
                  <ImagePlus className="size-6" />
                  Add
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      addImages(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border p-4">
              <Label className="inline-flex items-center gap-2">
                <Film className="size-4" /> Product video (optional, max 1)
              </Label>
              <p className="text-xs text-muted-foreground">Shown on the product detail page.</p>
              {productVideo ? (
                <div className="space-y-2">
                  <video src={productVideo.preview} controls className="max-h-48 w-full rounded-lg bg-black" />
                  <Button type="button" size="sm" variant="outline" onClick={() => setProductVideo(null)}>
                    Remove video
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground hover:bg-muted/40">
                  <Upload className="size-5" />
                  Upload MP4 / WebM
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      setVideo("product", e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
              <Label className="inline-flex items-center gap-2">
                <Clapperboard className="size-4" /> TikTok / Videos reel (optional, max 1)
              </Label>
              <p className="text-xs text-muted-foreground">
                Vertical clip featured on Beautora <strong>/videos</strong> marketplace reels.
              </p>
              {reelVideo ? (
                <div className="space-y-2">
                  <video
                    src={reelVideo.preview}
                    controls
                    className="mx-auto max-h-64 w-auto rounded-lg bg-black"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={() => setReelVideo(null)}>
                    Remove reel
                  </Button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-sm text-muted-foreground hover:bg-muted/40">
                  <Clapperboard className="size-5" />
                  Upload reel video
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={(e) => {
                      setVideo("reel", e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="seo_title">SEO title</Label>
              <Input id="seo_title" name="seo_title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seo_description">SEO description</Label>
              <Input id="seo_description" name="seo_description" />
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            Remaining budget: {formatMb(Math.max(0, remaining))}. Uploads are blocked if the 100 MB
            product limit would be crossed.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={pending || overBudget}
              onClick={() => {
                const el = document.getElementById("intent-field") as HTMLInputElement | null;
                if (el) el.value = "0";
              }}
            >
              {pending ? "Saving…" : "Save draft"}
            </Button>
            <input type="hidden" name="intent" id="intent-field" defaultValue="0" />
            <Button
              type="submit"
              variant="secondary"
              disabled={pending || overBudget}
              onClick={() => {
                const el = document.getElementById("intent-field") as HTMLInputElement | null;
                if (el) el.value = "1";
              }}
            >
              Submit for approval
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
