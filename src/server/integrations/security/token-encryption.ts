import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey() {
  const encoded = process.env.FINORA_TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("FINORA_TOKEN_ENCRYPTION_KEY is required");
  const key = Buffer.from(encoded, "base64");
  if (key.byteLength !== 32) throw new Error("FINORA_TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

/** Store only the returned envelope in the database. Never pass it to client components or API responses. */
export function encryptProviderCredential(credential: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(credential, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptProviderCredential(envelope: string) {
  const [version, iv, tag, ciphertext, extra] = envelope.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext || extra) throw new Error("Invalid credential envelope");
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}
