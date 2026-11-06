import type { NormalizedTransaction } from "../core/integration.types";

export function externalReferenceKey(providerId: string, externalId: string) {
  return `${providerId}:${externalId}`;
}

/** Heuristic fallback only. Call after the provider ID uniqueness check. */
export function transactionFingerprint(tx: NormalizedTransaction) {
  return [tx.accountExternalId, tx.bookedAt || tx.authorizedAt || "", tx.amount.toFixed(2), tx.currency, tx.description.toLocaleLowerCase().replace(/\s+/g, " ").trim()].join("|");
}
