export type ProviderCategory = "BANKING" | "WALLET" | "PAYMENT" | "CSV";
export type ProviderImplementation =
  "IMPLEMENTED_TESTED" | "IMPLEMENTED_AWAITING_CREDENTIALS" | "PLANNED" | "UNSUPPORTED";
export type ConnectionStatus =
  "NOT_CONNECTED" | "CONNECTING" | "CONNECTED" | "SYNCING" | "SYNC_ERROR" | "DISCONNECTED";
export type TransactionSource =
  "MANUAL" | "BANK_SYNC" | "WALLET_SYNC" | "CSV_IMPORT" | "PAYMENT_PROVIDER";
export type TransactionReviewStatus = "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
export type NormalizedTransactionStatus = "PENDING" | "BOOKED" | "CANCELLED";
export type NormalizedTransactionType = "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER" | "UNKNOWN";

export interface ProviderDescriptor {
  id: string;
  name: string;
  category: ProviderCategory;
  implementation: ProviderImplementation;
  capabilities: Array<"BALANCES" | "TRANSACTIONS" | "WEBHOOKS" | "OAUTH" | "CSV_IMPORT">;
  supportedCountries?: string[];
}

export interface ProviderAccount {
  externalId: string;
  name: string;
  maskedIdentifier?: string;
  currency: string;
  type: "CHECKING" | "SAVINGS" | "CARD" | "CASH" | "OTHER";
  balance?: number;
  metadata?: Record<string, unknown>;
}

export interface NormalizedTransaction {
  providerId: string;
  externalId: string;
  accountExternalId: string;
  amount: number;
  currency: string;
  type: NormalizedTransactionType;
  status: NormalizedTransactionStatus;
  description: string;
  merchant?: string;
  bookedAt?: string;
  authorizedAt?: string;
  isOwnAccountTransfer?: boolean;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface SyncCursor {
  value: string | null;
}
export interface TransactionPage {
  transactions: NormalizedTransaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ProviderAdapter {
  readonly descriptor: ProviderDescriptor;
  createAuthorizationUrl(input: {
    userId: string;
    redirectUri: string;
    state: string;
    codeChallenge?: string;
  }): Promise<string>;
  exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<{ credential: string; expiresAt?: Date }>;
  listAccounts(credential: string): Promise<ProviderAccount[]>;
  listTransactions(input: {
    credential: string;
    accountExternalId: string;
    cursor: SyncCursor;
  }): Promise<TransactionPage>;
  refreshCredential?(credential: string): Promise<{ credential: string; expiresAt?: Date }>;
  revoke?(credential: string): Promise<void>;
  verifyWebhook?(input: { rawBody: string; headers: Headers }): Promise<boolean>;
}

/** Persistence belongs behind this port; implementations must scope every lookup by userId. */
export interface IntegrationStore {
  getCredential(userId: string, integrationId: string): Promise<string>;
  getCursor(userId: string, integrationId: string, accountExternalId: string): Promise<SyncCursor>;
  hasExternalTransaction(userId: string, providerId: string, externalId: string): Promise<boolean>;
  findLikelyDuplicate(userId: string, transaction: NormalizedTransaction): Promise<boolean>;
  saveAccount(userId: string, integrationId: string, account: ProviderAccount): Promise<void>;
  saveTransaction(
    userId: string,
    integrationId: string,
    transaction: NormalizedTransaction,
    review: TransactionReviewStatus,
  ): Promise<void>;
  saveCursor(
    userId: string,
    integrationId: string,
    accountExternalId: string,
    cursor: SyncCursor,
  ): Promise<void>;
  recordSyncEvent(input: {
    userId: string;
    integrationId: string;
    outcome: "STARTED" | "SUCCEEDED" | "FAILED";
    imported?: number;
    errorCode?: string;
  }): Promise<void>;
}
