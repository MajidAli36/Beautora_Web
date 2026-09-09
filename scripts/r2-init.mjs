/**
 * Seed saas_salon/ folder layout in the R2 bucket.
 * Bucket must already exist (e.g. salon-storage). Then run:
 *   npm run r2:init
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const ROOT = "saas_salon";

function loadEnvLocal() {
  const candidates = [
    resolve(process.cwd(), ".env.development.local"),
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env.production.local"),
    resolve(process.cwd(), ".env.local.bak"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    return;
  }
}

loadEnvLocal();

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
  console.error("Missing R2_* vars in .env.development.local (or .env.local)");
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  try {
    await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
  } catch (err) {
    const code = err?.Code || err?.name;
    if (code === "NoSuchBucket") {
      console.error(`
Bucket "${bucket}" does not exist yet.

1. Open Cloudflare Dashboard → R2 Object Storage
2. Create a bucket named exactly: ${bucket}
3. Re-run: npm run r2:init
`);
      process.exit(1);
    }
    throw err;
  }

  const readme = [
    "Beautora / SyncOps salon media",
    "",
    "saas_salon/{organizationId}/branding/  — store logo & cover",
    "saas_salon/{organizationId}/deposits/  — online booking payment screenshots",
    "saas_salon/{organizationId}/invoices/  — subscription JazzCash proofs",
    "",
  ].join("\n");

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${ROOT}/README.txt`,
      Body: Buffer.from(readme, "utf8"),
      ContentType: "text/plain; charset=utf-8",
    })
  );

  for (const folder of ["branding", "deposits", "invoices"]) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `${ROOT}/_template/${folder}/.keep`,
        Body: Buffer.from(""),
        ContentType: "application/octet-stream",
      })
    );
  }

  console.log(`Bucket ready: ${bucket}`);
  console.log("Folder layout:");
  console.log(`  ${ROOT}/README.txt`);
  console.log(`  ${ROOT}/_template/branding/`);
  console.log(`  ${ROOT}/_template/deposits/`);
  console.log(`  ${ROOT}/_template/invoices/`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
