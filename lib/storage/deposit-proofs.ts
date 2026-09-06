import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  ensureSalonOrgFolders,
  isR2Configured,
  isSalonR2Path,
  R2_ROOT,
  r2DeleteObjects,
  r2ListPrefix,
  r2PutObject,
  r2SignedGetUrl,
  salonDepositKey,
  storageNotConfiguredError,
  type R2ObjectMeta,
} from "@/lib/storage/r2";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

/** Start cleanup when deposit proofs usage reaches this size. */
const CLEANUP_THRESHOLD_BYTES = 980 * 1024 * 1024; // 980 MB
/** Delete oldest objects until about this much space is reclaimed. */
const CLEANUP_FREE_BYTES = 100 * 1024 * 1024; // 100 MB

export type DepositProofUpload = {
  path: string;
  provider: "r2";
};

export async function getDepositProofsUsageBytes(): Promise<number> {
  if (!isR2Configured()) return 0;
  try {
    const files = await listDepositProofs();
    return files.reduce((sum, f) => sum + f.size, 0);
  } catch {
    return 0;
  }
}

async function listDepositProofs(): Promise<R2ObjectMeta[]> {
  const all = await r2ListPrefix(`${R2_ROOT}/`);
  return all.filter((f) => f.path.includes("/deposits/"));
}

/**
 * When deposit proofs usage is ≥ 980 MB, delete the oldest files
 * until ~100 MB is freed. Clears matching appointment_deposits.proof_path.
 */
export async function maybeCleanupDepositProofs(): Promise<{
  cleaned: boolean;
  freedBytes: number;
  deletedPaths: string[];
}> {
  if (!isR2Configured()) {
    return { cleaned: false, freedBytes: 0, deletedPaths: [] };
  }

  let files: R2ObjectMeta[];
  try {
    files = await listDepositProofs();
  } catch (err) {
    console.error("[deposit-proofs] list failed:", err);
    return { cleaned: false, freedBytes: 0, deletedPaths: [] };
  }

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  if (totalBytes < CLEANUP_THRESHOLD_BYTES) {
    return { cleaned: false, freedBytes: 0, deletedPaths: [] };
  }

  const oldestFirst = [...files].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const toDelete: R2ObjectMeta[] = [];
  let freed = 0;
  for (const file of oldestFirst) {
    if (freed >= CLEANUP_FREE_BYTES) break;
    toDelete.push(file);
    freed += file.size;
  }

  if (!toDelete.length) {
    return { cleaned: false, freedBytes: 0, deletedPaths: [] };
  }

  const paths = toDelete.map((f) => f.path);
  try {
    await r2DeleteObjects(paths);
  } catch (err) {
    console.error("[deposit-proofs] cleanup remove failed:", err);
    return { cleaned: false, freedBytes: 0, deletedPaths: [] };
  }

  const admin = tryCreateAdminClient();
  if (admin) {
    await admin.from("appointment_deposits").update({ proof_path: null }).in("proof_path", paths);
  }

  return { cleaned: true, freedBytes: freed, deletedPaths: paths };
}

/** Upload a payment screenshot to Cloudflare R2 under saas_salon/{org}/deposits/… */
export async function uploadDepositProof(params: {
  organizationId: string;
  appointmentId: string;
  bytes: Buffer;
  contentType: string;
  extension: string;
}): Promise<{ ok: true; result: DepositProofUpload } | { ok: false; error: string }> {
  if (!isR2Configured()) {
    return { ok: false, error: storageNotConfiguredError("Image") };
  }

  await maybeCleanupDepositProofs();

  try {
    await ensureSalonOrgFolders(params.organizationId);
    const path = salonDepositKey(
      params.organizationId,
      params.appointmentId,
      params.extension
    );
    await r2PutObject({
      key: path,
      body: params.bytes,
      contentType: params.contentType || "image/jpeg",
    });
    return { ok: true, result: { path, provider: "r2" } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return { ok: false, error: `Could not upload payment screenshot: ${message}` };
  }
}

/** Short-lived URL for staff to view a payment screenshot. */
export async function getDepositProofSignedUrl(
  storedPath: string
): Promise<{ url?: string; error?: string }> {
  if (
    storedPath.startsWith("gcs:") ||
    storedPath.startsWith("gs://") ||
    !isSalonR2Path(storedPath)
  ) {
    return {
      error:
        "This proof was stored on previous storage. Ask the customer to re-upload, or request a new booking screenshot.",
    };
  }

  if (!isR2Configured()) return { error: "Storage is not available" };

  try {
    const url = await r2SignedGetUrl(storedPath, SIGNED_URL_TTL_SECONDS);
    return { url };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open payment screenshot";
    return { error: message };
  }
}
