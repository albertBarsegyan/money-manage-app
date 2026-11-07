import type {
  IntegrationStore,
  NormalizedTransaction,
  ProviderAdapter,
  TransactionReviewStatus,
} from "../core/integration.types";

export interface SyncOptions {
  autoConfirmTrustedTransactions?: boolean;
  maxPages?: number;
}

/** Import one account incrementally; provider IDs are authoritative, fingerprints always need human review. */
export async function syncAccount(input: {
  userId: string;
  integrationId: string;
  adapter: ProviderAdapter;
  accountExternalId: string;
  store: IntegrationStore;
  options?: SyncOptions;
}) {
  const { userId, integrationId, adapter, accountExternalId, store } = input;
  const maxPages = input.options?.maxPages ?? 25;
  let imported = 0;
  await store.recordSyncEvent({ userId, integrationId, outcome: "STARTED" });
  try {
    const credential = await store.getCredential(userId, integrationId);
    let cursor = await store.getCursor(userId, integrationId, accountExternalId);
    for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
      const page = await adapter.listTransactions({ credential, accountExternalId, cursor });
      for (const transaction of page.transactions) {
        if (!isValid(transaction, accountExternalId)) continue;
        if (
          await store.hasExternalTransaction(userId, adapter.descriptor.id, transaction.externalId)
        )
          continue;
        const likelyDuplicate = await store.findLikelyDuplicate(userId, transaction);
        const review: TransactionReviewStatus = chooseReviewStatus(
          transaction,
          likelyDuplicate,
          input.options,
        );
        await store.saveTransaction(userId, integrationId, transaction, review);
        imported++;
      }
      cursor = { value: page.nextCursor };
      await store.saveCursor(userId, integrationId, accountExternalId, cursor);
      if (!page.hasMore) break;
      if (pageNumber === maxPages - 1) throw new Error("SYNC_PAGE_LIMIT_REACHED");
    }
    await store.recordSyncEvent({ userId, integrationId, outcome: "SUCCEEDED", imported });
    return { imported, cursor };
  } catch (error) {
    await store.recordSyncEvent({
      userId,
      integrationId,
      outcome: "FAILED",
      imported,
      errorCode: safeErrorCode(error),
    });
    throw error;
  }
}

function isValid(tx: NormalizedTransaction, accountExternalId: string) {
  return (
    tx.accountExternalId === accountExternalId &&
    Boolean(tx.externalId) &&
    Boolean(tx.currency) &&
    Number.isFinite(tx.amount) &&
    tx.amount >= 0 &&
    Boolean(tx.description)
  );
}

function chooseReviewStatus(
  tx: NormalizedTransaction,
  likelyDuplicate: boolean,
  options?: SyncOptions,
): TransactionReviewStatus {
  if (likelyDuplicate || tx.type === "UNKNOWN" || tx.type === "TRANSFER" || tx.isOwnAccountTransfer)
    return "PENDING_REVIEW";
  if (options?.autoConfirmTrustedTransactions && tx.status === "BOOKED") return "CONFIRMED";
  return "PENDING_REVIEW";
}

function safeErrorCode(error: unknown) {
  return error instanceof Error
    ? error.message.replace(/[^A-Z0-9_:-]/gi, "_").slice(0, 80)
    : "UNKNOWN_SYNC_ERROR";
}
