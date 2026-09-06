import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type _Object,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 layout (bucket: salon-storage):
 *
 *   saas_salon/
 *     {organizationId}/
 *       branding/logo-….jpg
 *       branding/cover-….jpg
 *       deposits/{appointmentId}/….jpg
 *       invoices/{paymentId}.pdf
 */

export const R2_ROOT = "saas_salon";

let client: S3Client | null = null;
let bucketReady: Promise<void> | null = null;

export type R2ObjectMeta = {
  path: string;
  size: number;
  createdAt: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}. Add Cloudflare R2 credentials to .env.local.`);
  }
  return value;
}

export function getR2Config() {
  return {
    endpoint: requiredEnv("R2_ENDPOINT"),
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    bucket: requiredEnv("R2_BUCKET"),
  };
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ENDPOINT?.trim() &&
      process.env.R2_ACCESS_KEY_ID?.trim() &&
      process.env.R2_SECRET_ACCESS_KEY?.trim() &&
      process.env.R2_BUCKET?.trim()
  );
}

export function getR2Client(): S3Client {
  if (client) return client;
  const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function getR2Bucket(): string {
  return getR2Config().bucket;
}

/** Verify the R2 bucket is reachable (create it in Cloudflare Dashboard if missing). */
export async function ensureR2Bucket(): Promise<void> {
  if (bucketReady) return bucketReady;

  bucketReady = (async () => {
    const Bucket = getR2Bucket();
    try {
      await getR2Client().send(new ListObjectsV2Command({ Bucket, MaxKeys: 1 }));
    } catch (err) {
      const code =
        (err as { Code?: string; name?: string }).Code ||
        (err as { name?: string }).name ||
        "";
      if (code === "NoSuchBucket") {
        throw new Error(
          `R2 bucket "${Bucket}" does not exist. Create it in Cloudflare → R2, then run npm run r2:init.`
        );
      }
      throw err;
    }
  })().catch((err) => {
    bucketReady = null;
    throw err;
  });

  return bucketReady;
}

export function salonBrandingKey(
  organizationId: string,
  kind: "logo" | "cover",
  extension: string
): string {
  return `${R2_ROOT}/${organizationId}/branding/${kind}-${Date.now()}.${extension}`;
}

export function salonDepositKey(
  organizationId: string,
  appointmentId: string,
  extension: string
): string {
  return `${R2_ROOT}/${organizationId}/deposits/${appointmentId}/${Date.now()}.${extension}`;
}

export function salonInvoiceKey(
  organizationId: string,
  paymentId: string,
  extension: string
): string {
  return `${R2_ROOT}/${organizationId}/invoices/${paymentId}.${extension}`;
}

export async function r2PutObject(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<void> {
  await ensureR2Bucket();
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      CacheControl: "private, max-age=3600",
    })
  );
}

export async function r2SignedGetUrl(
  key: string,
  expiresInSeconds: number
): Promise<string> {
  await ensureR2Bucket();
  return getSignedUrl(
    getR2Client(),
    new GetObjectCommand({ Bucket: getR2Bucket(), Key: key }),
    { expiresIn: expiresInSeconds }
  );
}

export async function r2DeleteObject(key: string): Promise<void> {
  await ensureR2Bucket();
  await getR2Client().send(
    new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
  );
}

export async function r2DeleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  await ensureR2Bucket();
  const Bucket = getR2Bucket();
  const s3 = getR2Client();
  const chunkSize = 1000;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    await s3.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      })
    );
  }
}

export async function r2ListPrefix(prefix: string): Promise<R2ObjectMeta[]> {
  await ensureR2Bucket();
  const Bucket = getR2Bucket();
  const s3 = getR2Client();
  const out: R2ObjectMeta[] = [];
  let ContinuationToken: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket,
        Prefix: prefix,
        ContinuationToken,
      })
    );
    for (const item of page.Contents ?? []) {
      const meta = toMeta(item);
      if (meta) out.push(meta);
    }
    ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (ContinuationToken);

  return out;
}

function toMeta(item: _Object): R2ObjectMeta | null {
  if (!item.Key || item.Key.endsWith("/")) return null;
  return {
    path: item.Key,
    size: Number(item.Size ?? 0),
    createdAt: (item.LastModified ?? new Date(0)).toISOString(),
  };
}

export function storageNotConfiguredError(kind = "File"): string {
  return `${kind} storage is not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, and R2_BUCKET in .env.local.`;
}

/** Creates virtual folders under saas_salon/{orgId}/ for branding, deposits, invoices. */
export async function ensureSalonOrgFolders(organizationId: string): Promise<void> {
  const folders = ["branding", "deposits", "invoices"] as const;
  await Promise.all(
    folders.map((folder) =>
      r2PutObject({
        key: `${R2_ROOT}/${organizationId}/${folder}/.keep`,
        body: Buffer.from(""),
        contentType: "application/octet-stream",
      })
    )
  );
}

/** One-time bucket layout: saas_salon/README + shared folder markers. */
export async function ensureSalonBucketLayout(): Promise<void> {
  await ensureR2Bucket();
  const readme = [
    "Beautora / SyncOps salon media",
    "",
    "saas_salon/{organizationId}/branding/  — store logo & cover",
    "saas_salon/{organizationId}/deposits/  — online booking payment screenshots",
    "saas_salon/{organizationId}/invoices/  — subscription JazzCash proofs",
    "",
  ].join("\n");

  await r2PutObject({
    key: `${R2_ROOT}/README.txt`,
    body: Buffer.from(readme, "utf8"),
    contentType: "text/plain; charset=utf-8",
  });
}

/** True when path is under our R2 app root (or legacy salon/). */
export function isSalonR2Path(path: string): boolean {
  return path.startsWith(`${R2_ROOT}/`) || path.startsWith("salon/");
}
