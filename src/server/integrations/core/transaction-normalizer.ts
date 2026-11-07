import type { NormalizedTransaction, NormalizedTransactionType } from "./integration.types";

export interface ProviderTransaction {
  transactionId?: string;
  accountId: string;
  amount: number;
  currency: string;
  name?: string;
  merchantName?: string;
  date?: string;
  authorizedDate?: string;
  pending?: boolean;
  paymentChannel?: string;
  personalFinanceCategory?: string;
  counterpartAccountId?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export function normalizeTransaction(
  providerId: string,
  tx: ProviderTransaction,
): NormalizedTransaction {
  if (!Number.isFinite(tx.amount) || !tx.currency || !tx.accountId)
    throw new Error("Invalid provider transaction");
  const description = (tx.merchantName || tx.name || "Imported transaction").trim().slice(0, 240);
  const category =
    `${tx.personalFinanceCategory || ""} ${tx.name || ""} ${tx.merchantName || ""}`.toLowerCase();
  const isTransfer =
    Boolean(tx.counterpartAccountId) ||
    /\b(transfer|own account|between accounts)\b/.test(category);
  let type: NormalizedTransactionType = isTransfer
    ? "TRANSFER"
    : tx.amount < 0
      ? "EXPENSE"
      : "INCOME";
  if (!isTransfer && /refund|reversal|returned/.test(category)) type = "REFUND";
  return {
    providerId,
    externalId: tx.transactionId || stableTransactionId(providerId, tx),
    accountExternalId: tx.accountId,
    amount: Math.abs(tx.amount),
    currency: tx.currency.toUpperCase(),
    type,
    status: tx.pending ? "PENDING" : "BOOKED",
    description,
    merchant: tx.merchantName?.trim().slice(0, 160),
    bookedAt: tx.date,
    authorizedAt: tx.authorizedDate,
    isOwnAccountTransfer: isTransfer,
    reference: tx.reference,
    metadata: tx.metadata,
  };
}

function stableTransactionId(providerId: string, tx: ProviderTransaction): string {
  const stableParts = [
    providerId,
    tx.accountId,
    tx.date || tx.authorizedDate || "undated",
    tx.amount.toFixed(2),
    tx.currency,
    tx.merchantName || tx.name || "",
  ];
  return `derived:${stableParts
    .join(":")
    .toLowerCase()
    .replace(/[^a-z0-9:.-]/g, "-")}`;
}
