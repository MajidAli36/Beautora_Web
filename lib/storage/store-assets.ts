import "server-only";

import {
  ensureSalonOrgFolders,
  isR2Configured,
  isSalonR2Path,
  r2PutObject,
  r2SignedGetUrl,
  salonBrandingKey,
  storageNotConfiguredError,
} from "@/lib/storage/r2";

const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7; // 7 days for store branding pages

export async function uploadStoreAsset(params: {
  organizationId: string;
  kind: "logo" | "cover";
  bytes: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ ok: true; result: { path: string } } | { ok: false; error: string }> {
  if (!isR2Configured()) {
    return { ok: false, error: storageNotConfiguredError("Image") };
  }

  try {
    await ensureSalonOrgFolders(params.organizationId);
    const path = salonBrandingKey(params.organizationId, params.kind, params.extension);
    await r2PutObject({
      key: path,
      body: params.bytes,
      contentType: params.contentType,
    });
    return { ok: true, result: { path } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { ok: false, error: `Could not upload image: ${message}` };
  }
}

export async function getStoreAssetSignedUrl(
  path: string
): Promise<{ url?: string; error?: string }> {
  if (!isR2Configured()) return { error: "Storage is not available" };
  if (!isSalonR2Path(path)) {
    return {
      error: "This image is on old storage. Re-upload the logo or cover in Settings → Store profile.",
    };
  }

  try {
    const url = await r2SignedGetUrl(path, SIGNED_URL_SECONDS);
    return { url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open image";
    return { error: message };
  }
}
