import type {
  AccountRecord,
  ExpenseRecord,
  FinanceData,
  IncomeRecord,
  MonitoredCardRecord,
  NotificationReaderSettings,
  SalaryPeriod,
} from "../../models";

export type StorageMode = "LOCAL_ONLY" | "PRIVATE_CLOUD" | "CUSTOM_DATABASE";
export interface StorageCapabilities {
  inMemory: boolean;
  persistent: boolean;
  synchronization: boolean;
  importExport: boolean;
  available: boolean;
}

export interface StorageProvider {
  readonly id: StorageMode;
  readonly capabilities: StorageCapabilities;
  initialize(): Promise<void>;
  getSnapshot(): FinanceData;
  subscribe(listener: () => void): () => void;
  getIncome(): IncomeRecord[];
  addIncome(record: IncomeRecord): void;
  updateIncome(record: IncomeRecord): void;
  deleteIncome(id: string): void;
  getExpenses(): ExpenseRecord[];
  addExpense(record: ExpenseRecord): void;
  updateExpense(record: ExpenseRecord): void;
  deleteExpense(id: string): void;
  getAccounts(): AccountRecord[];
  addAccount(record: AccountRecord): void;
  updateAccount(record: AccountRecord): void;
  deleteAccount(id: string): void;
  getSalaryPeriods(): SalaryPeriod[];
  addSalaryPeriod(record: SalaryPeriod): void;
  updateSalaryPeriod(record: SalaryPeriod): void;
  deleteSalaryPeriod(id: string): void;
  getMonitoredCards(): MonitoredCardRecord[];
  addMonitoredCard(record: MonitoredCardRecord): void;
  updateMonitoredCard(record: MonitoredCardRecord): void;
  deleteMonitoredCard(id: string): void;
  getNotificationReaderSettings(): NotificationReaderSettings;
  updateNotificationReaderSettings(settings: NotificationReaderSettings): void;
  clearAllData(): void;
}

export interface FutureStorageProvider extends StorageProvider {
  /** Future persistent providers must require explicit confirmation before import or migration. */
  migrateFrom(data: FinanceData, confirmed: boolean): Promise<void>;
}
