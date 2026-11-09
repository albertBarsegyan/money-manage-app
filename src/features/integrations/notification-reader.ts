import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type {
  CurrencyCode,
  ExpenseBudgetMode,
  ExpenseRecord,
  MonitoredCardRecord,
  TransactionSource,
  TransactionType,
} from "@/entities/finance";
import { isCurrency } from "@/entities/finance/validation";

export interface DetectedTransaction {
  id: string;
  packageName: string;
  amountMinor: number;
  currency: CurrencyCode;
  merchant: string;
  occurredAt: string;
  type: "EXPENSE" | "INCOME";
  lastFour?: string | null;
  cardId?: string | null;
  reviewStatus: "PENDING_REVIEW";
}

export interface ApprovedNotificationExpense {
  id: string;
  amountMinor: number;
  currency: CurrencyCode;
  category: string;
  accountId?: string | null;
  occurredAt: string;
  description: string;
  status: "CONFIRMED";
  type: TransactionType;
  source: TransactionSource;
  reviewStatus: "CONFIRMED";
  budgetMode?: ExpenseBudgetMode | null;
  externalReference: string;
}

export interface InstalledReaderApp {
  packageName: string;
  name: string;
}

export interface NotificationReaderStatus {
  accessGranted: boolean;
  enabled: boolean;
  selectedPackages: string[];
  notificationsAllowed: boolean;
}

interface NotificationReaderPlugin {
  getStatus(): Promise<NotificationReaderStatus>;
  openAccessSettings(): Promise<void>;
  setMonitoringEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  setSelectedPackages(options: { packages: string[] }): Promise<void>;
  setMonitoredCards(options: { cards: MonitoredCardRecord[] }): Promise<void>;
  getInstalledApps(): Promise<{ apps: InstalledReaderApp[] }>;
  getPendingCandidates(): Promise<{ candidates: DetectedTransaction[] }>;
  consumeApprovedExpenses(): Promise<{ expenses: ApprovedNotificationExpense[] }>;
  dismissCandidate(options: { id: string }): Promise<void>;
  clearPendingCandidates(): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  addListener(
    eventName: "transactionDetected",
    listener: (candidate: DetectedTransaction) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "expenseApproved",
    listener: (expense: ApprovedNotificationExpense) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "candidateDismissed",
    listener: (payload: { id: string }) => void,
  ): Promise<PluginListenerHandle>;
}

const nativeReader = registerPlugin<NotificationReaderPlugin>("NotificationReader");

export function toExpenseRecord(expense: ApprovedNotificationExpense): ExpenseRecord | null {
  if (
    !expense.id ||
    !Number.isSafeInteger(expense.amountMinor) ||
    expense.amountMinor <= 0 ||
    !isCurrency(expense.currency) ||
    !expense.description?.trim() ||
    !Number.isFinite(Date.parse(expense.occurredAt)) ||
    !expense.externalReference ||
    (expense.type !== "EXPENSE" &&
      expense.type !== "INCOME" &&
      expense.type !== "REFUND" &&
      expense.type !== "TRANSFER") ||
    (expense.source !== "BANK_SYNC" && expense.source !== "WALLET_SYNC")
  )
    return null;
  return {
    id: expense.id,
    amountMinor: expense.amountMinor,
    currency: expense.currency,
    category: expense.category || (expense.type === "INCOME" ? "Income" : "Other"),
    accountId: expense.accountId || undefined,
    occurredAt: expense.occurredAt,
    description: expense.description.trim(),
    status: "CONFIRMED",
    type: expense.type,
    source: expense.source,
    reviewStatus: "CONFIRMED",
    budgetMode: expense.type === "EXPENSE" ? (expense.budgetMode ?? "GLOBAL") : undefined,
    externalReference: expense.externalReference,
  };
}

/** Browser builds deliberately have no notification-reading implementation. */
export const notificationReader = {
  isAvailable: () => Capacitor.getPlatform() === "android",
  getStatus: (): Promise<NotificationReaderStatus> =>
    nativeReader.getStatus().catch(() => ({
      accessGranted: false,
      enabled: false,
      selectedPackages: [],
      notificationsAllowed: false,
    })),
  openAccessSettings: () => nativeReader.openAccessSettings(),
  setMonitoringEnabled: (enabled: boolean) => nativeReader.setMonitoringEnabled({ enabled }),
  setSelectedPackages: (packages: string[]) => nativeReader.setSelectedPackages({ packages }),
  setMonitoredCards: (cards: MonitoredCardRecord[]) => nativeReader.setMonitoredCards({ cards }),
  getInstalledApps: () => nativeReader.getInstalledApps(),
  getPendingCandidates: () => nativeReader.getPendingCandidates(),
  consumeApprovedExpenses: () =>
    nativeReader.consumeApprovedExpenses().catch(() => ({ expenses: [] })),
  dismissCandidate: (id: string) => nativeReader.dismissCandidate({ id }),
  clearPendingCandidates: () => nativeReader.clearPendingCandidates(),
  requestNotificationPermission: () => nativeReader.requestNotificationPermission(),
  addListener: (
    listener: (candidate: DetectedTransaction) => void,
  ): Promise<PluginListenerHandle> => nativeReader.addListener("transactionDetected", listener),
  addApprovedListener: (
    listener: (expense: ApprovedNotificationExpense) => void,
  ): Promise<PluginListenerHandle> => nativeReader.addListener("expenseApproved", listener),
  addDismissedListener: (
    listener: (payload: { id: string }) => void,
  ): Promise<PluginListenerHandle> => nativeReader.addListener("candidateDismissed", listener),
};
