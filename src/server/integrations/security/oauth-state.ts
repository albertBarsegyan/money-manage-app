import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type OAuthStatePayload = { userId: string; nonce: string; expiresAt: number };

function stateSecret() {
  const secret = process.env.FINORA_OAUTH_STATE_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("FINORA_OAUTH_STATE_SECRET must be at least 32 characters");
  return secret;
}

export function createOAuthState(userId: string, ttlSeconds = 600) {
  const payload: OAuthStatePayload = {
    userId,
    nonce: randomBytes(24).toString("base64url"),
    expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export async function verifyOAuthState(
  state: string,
  expectedUserId: string,
  /** Back with an atomic, single-use nonce store (for example a DB unique key or Redis SET NX). */
  consumeNonce: (nonce: string, expiresAt: number) => Promise<boolean>,
): Promise<OAuthStatePayload> {
  const [encoded, supplied, extra] = state.split(".");
  if (!encoded || !supplied || extra) throw new Error("Invalid OAuth state");
  const expected = createHmac("sha256", stateSecret()).update(encoded).digest();
  const actual = Buffer.from(supplied, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new Error("Invalid OAuth state signature");
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as OAuthStatePayload;
  if (
    payload.userId !== expectedUserId ||
    payload.expiresAt < Math.floor(Date.now() / 1000) ||
    !payload.nonce
  )
    throw new Error("Expired or mismatched OAuth state");
  if (!(await consumeNonce(payload.nonce, payload.expiresAt)))
    throw new Error("OAuth state has already been used");
  return payload;
}
