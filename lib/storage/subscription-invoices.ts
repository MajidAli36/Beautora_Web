import "server-only";

import {
  ensureSalonOrgFolders,
  isR2Configured,
  isSalonR2Path,
  r2PutObject,
  r2SignedGetUrl,
  salonInvoiceKey,
  storageNotConfiguredError,
} from "@/lib/storage/r2";

const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

export async function uploadSubscriptionInvoice(params: {
  organizationId: string;
  paymentId: string;
  bytes: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ ok: true; result: { path: string } } | { ok: false; error: string }> {
  if (!isR2Configured()) {
    return { ok: false, error: storageNotConfiguredError("Invoice") };
  }

  try {
    await ensureSalonOrgFolders(params.organizationId);
    const path = salonInvoiceKey(
      params.organizationId,
      params.paymentId,
      params.extension
    );
    await r2PutObject({
      key: path,
      body: params.bytes,
      contentType: params.contentType,
    });
    return { ok: true, result: { path } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { ok: false, error: `Could not upload invoice: ${message}` };
  }
}

export async function getSubscriptionInvoiceSignedUrl(
  path: string
): Promise<{ url?: string; error?: string }> {
  if (!isR2Configured()) return { error: "Storage is not available" };
  if (!isSalonR2Path(path)) {
    return {
      error: "This invoice is on old storage. Ask the store to re-upload the JazzCash receipt.",
    };
  }

  try {
    const url = await r2SignedGetUrl(path, SIGNED_URL_SECONDS);
    return { url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open invoice";
    return { error: message };
  }
}
