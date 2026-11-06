import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Verify the exact raw request body before parsing or processing a webhook. */
export function verifyHmacWebhook(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !secret) return false;
  const suppliedHex = signatureHeader.replace(/^sha256=/i, "");
  if (!/^[a-f0-9]{64}$/i.test(suppliedHex)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
