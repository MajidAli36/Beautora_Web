import "server-only";

import {
  isR2Configured,
  r2DeleteObject,
  r2PutObject,
  r2SignedGetUrl,
  R2_ROOT,
  storageNotConfiguredError,
} from "@/lib/storage/r2";
import {
  MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES,
} from "@/lib/marketplace/media-limits";

export {
  MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES,
  MARKETPLACE_PRODUCT_MIN_IMAGES,
  MARKETPLACE_PRODUCT_MAX_IMAGES,
} from "@/lib/marketplace/media-limits";

/** Hard cap for all media on one marketplace product (images + videos). */

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function extFor(mime: string, kind: "image" | "video"): string | null {
  if (kind === "image") {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/gif") return "gif";
    if (mime === "image/jpeg") return "jpg";
    return null;
  }
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/mp4") return "mp4";
  return null;
}

export function marketplaceProductMediaKey(
  sellerId: string,
  productId: string,
  kind: "image" | "video" | "reel",
  extension: string
): string {
  return `${R2_ROOT}/marketplace/${sellerId}/${productId}/${kind}-${Date.now()}.${extension}`;
}

export async function getMarketplaceMediaSignedUrl(
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  if (!isR2Configured()) return null;
  try {
    return await r2SignedGetUrl(path, 60 * 60 * 24 * 7);
  } catch {
    return null;
  }
}

export type UploadedMedia = {
  path: string;
  url: string;
  byteSize: number;
  contentType: string;
};

export async function uploadMarketplaceMediaFile(input: {
  sellerId: string;
  productId: string;
  file: File;
  kind: "image" | "video" | "reel";
  remainingBudgetBytes: number;
}): Promise<{ data?: UploadedMedia; error?: string }> {
  if (!isR2Configured()) {
    return { error: storageNotConfiguredError("Marketplace media") };
  }

  const mime = input.file.type || "application/octet-stream";
  if (input.kind === "image" && !IMAGE_TYPES.has(mime)) {
    return { error: "Images must be JPEG, PNG, WebP, or GIF." };
  }
  if ((input.kind === "video" || input.kind === "reel") && !VIDEO_TYPES.has(mime)) {
    return { error: "Videos must be MP4, WebM, or MOV." };
  }

  const size = input.file.size;
  if (size <= 0) return { error: "Empty file." };
  if (size > input.remainingBudgetBytes) {
    return {
      error: `This file would exceed the ${MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES / (1024 * 1024)} MB product media limit.`,
    };
  }
  if (size > MARKETPLACE_PRODUCT_MEDIA_MAX_BYTES) {
    return { error: "File exceeds the 100 MB product media limit." };
  }

  const ext = extFor(mime, input.kind === "image" ? "image" : "video");
  if (!ext) return { error: "Unsupported file type." };

  const key = marketplaceProductMediaKey(
    input.sellerId,
    input.productId,
    input.kind,
    ext
  );
  const buffer = Buffer.from(await input.file.arrayBuffer());
  await r2PutObject({ key, body: buffer, contentType: mime });
  const url = await r2SignedGetUrl(key, 60 * 60 * 24 * 7);

  return {
    data: {
      path: key,
      url,
      byteSize: size,
      contentType: mime,
    },
  };
}

export async function deleteMarketplaceMediaPath(path: string | null | undefined) {
  if (!path || !isR2Configured()) return;
  try {
    await r2DeleteObject(path);
  } catch {
    /* best-effort */
  }
}
