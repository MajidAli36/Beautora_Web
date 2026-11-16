import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import {
  awardLoyaltyPoints,
  getLoyaltyBalance,
  getLoyaltyRules,
} from "@/lib/customer-apps/engagement";

const QR_TTL_MS = 10 * 60 * 1000; // 10 minutes

function signingSecret() {
  return (
    process.env.LOYALTY_QR_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "beautora-loyalty-qr-dev"
  );
}

export type LoyaltyQrClaims = {
  v: 1;
  appId: string;
  orgId: string;
  phone: string;
  nonce: string;
  bal: number;
  exp: number;
};

function b64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string) {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64").toString("utf8");
}

function sign(payloadB64: string) {
  return b64url(createHmac("sha256", signingSecret()).update(payloadB64).digest());
}

export function issueLoyaltyQrToken(input: {
  customerAppId: string;
  organizationId: string;
  phone: string;
  balance: number;
}): { token: string; code: string; expiresAt: string; claims: LoyaltyQrClaims } {
  const claims: LoyaltyQrClaims = {
    v: 1,
    appId: input.customerAppId,
    orgId: input.organizationId,
    phone: input.phone.replace(/[^\d+]/g, ""),
    nonce: randomBytes(12).toString("hex"),
    bal: input.balance,
    exp: Date.now() + QR_TTL_MS,
  };
  const payloadB64 = b64url(JSON.stringify(claims));
  const sig = sign(payloadB64);
  const token = `btr1.${payloadB64}.${sig}`;
  const code = claims.nonce.slice(0, 4).toUpperCase() + "-" + claims.nonce.slice(4, 8).toUpperCase();
  return {
    token,
    code,
    expiresAt: new Date(claims.exp).toISOString(),
    claims,
  };
}

export function verifyLoyaltyQrToken(
  token: string
): { ok: true; claims: LoyaltyQrClaims } | { ok: false; error: string } {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "btr1") {
    return { ok: false, error: "Invalid QR token format" };
  }
  const [, payloadB64, sig] = parts;
  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: "Invalid QR signature" };
    }
  } catch {
    return { ok: false, error: "Invalid QR signature" };
  }
  let claims: LoyaltyQrClaims;
  try {
    claims = JSON.parse(fromB64url(payloadB64)) as LoyaltyQrClaims;
  } catch {
    return { ok: false, error: "Corrupt QR payload" };
  }
  if (claims.v !== 1 || !claims.appId || !claims.phone || !claims.nonce) {
    return { ok: false, error: "Invalid QR claims" };
  }
  if (Date.now() > Number(claims.exp)) {
    return { ok: false, error: "QR code expired — ask the customer to refresh" };
  }
  return { ok: true, claims };
}

export async function redeemLoyaltyQr(input: {
  customerAppId: string;
  organizationIds: string[];
  token: string;
  points: number;
  reason?: string;
}): Promise<{ balance: number; redeemed: number }> {
  const points = Math.floor(Number(input.points));
  if (!Number.isFinite(points) || points < 1) {
    throw new Error("Points to redeem must be at least 1");
  }

  const verified = verifyLoyaltyQrToken(input.token);
  if (!verified.ok) throw new Error(verified.error);
  const { claims } = verified;

  if (claims.appId !== input.customerAppId) {
    throw new Error("QR does not belong to this customer app");
  }

  const rules = await getLoyaltyRules(input.customerAppId);
  if (!rules.enabled) throw new Error("Loyalty is not enabled");
  if (points < rules.min_redeem_points) {
    throw new Error(`Minimum redeem is ${rules.min_redeem_points} points`);
  }

  const orgId =
    input.organizationIds.find((id) => id === claims.orgId) ||
    input.organizationIds[0];
  if (!orgId) throw new Error("No organization linked to this app");

  const current = await getLoyaltyBalance(input.customerAppId, claims.phone);
  if (current.balance < points) {
    throw new Error(`Insufficient points (balance ${current.balance})`);
  }

  const result = await awardLoyaltyPoints({
    customerAppId: input.customerAppId,
    organizationId: orgId,
    phone: claims.phone,
    delta: -points,
    reason: input.reason?.trim() || `QR redeem (${points} pts)`,
    idempotencyKey: `qr_redeem_${claims.nonce}_${points}`,
    referenceType: "qr_redeem",
    referenceId: claims.nonce,
  });

  if (!result.awarded && result.balance === current.balance) {
    // Same nonce+points already applied
    throw new Error("This QR redeem was already applied");
  }

  return { balance: result.balance, redeemed: points };
}
