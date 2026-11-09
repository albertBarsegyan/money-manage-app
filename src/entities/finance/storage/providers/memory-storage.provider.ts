import type {
  AccountRecord,
  ExpenseRecord,
  FinanceData,
  IncomeRecord,
  MonitoredCardRecord,
  NotificationReaderSettings,
  SalaryPeriod,
} from "../../models";
import { emptyFinanceData } from "../../models";
import {
  validateAccount,
  validateExpense,
  validateIncome,
  validateMonitoredCard,
  validateSalaryPeriod,
} from "../../validation";
import type { StorageCapabilities, StorageProvider } from "../contracts/storage-provider";

export class MemoryStorageProvider implements StorageProvider {
  readonly id = "LOCAL_ONLY" as const;
  readonly capabilities: StorageCapabilities = {
    inMemory: true,
    persistent: false,
    synchronization: false,
    importExport: false,
    available: true,
  };
  private data: FinanceData = emptyFinanceData();
  private readonly listeners = new Set<() => void>();

  async initialize(): Promise<void> {}

  getSnapshot = () => this.data;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getIncome = () => this.data.income;
  getExpenses = () => this.data.expenses;
  getAccounts = () => this.data.accounts;
  getSalaryPeriods = () => this.data.salaryPeriods;
  getMonitoredCards = () => this.data.monitoredCards;
  getNotificationReaderSettings = () => this.data.notificationReader;

  addIncome(record: IncomeRecord) {
    this.assertValid(validateIncome(record));
    this.assertIncomeReferences(record);
    this.assertUnique(this.data.income, record.id);
    this.commit({ ...this.data, income: [...this.data.income, { ...record }] });
  }
  updateIncome(record: IncomeRecord) {
    this.assertValid(validateIncome(record));
    this.assertIncomeReferences(record);
    this.assertExists(this.data.income, record.id);
    this.commit({
      ...this.data,
      income: this.data.income.map((item) => (item.id === record.id ? { ...record } : item)),
    });
  }
  deleteIncome(id: string) {
    this.commit({ ...this.data, income: this.data.income.filter((item) => item.id !== id) });
  }
  addExpense(record: ExpenseRecord) {
    this.assertValid(validateExpense(record));
    this.assertExpenseReferences(record);
    this.assertUnique(this.data.expenses, record.id);
    this.commit({ ...this.data, expenses: [...this.data.expenses, { ...record }] });
  }
  updateExpense(record: ExpenseRecord) {
    this.assertValid(validateExpense(record));
    this.assertExpenseReferences(record);
    this.assertExists(this.data.expenses, record.id);
    this.commit({
      ...this.data,
      expenses: this.data.expenses.map((item) => (item.id === record.id ? { ...record } : item)),
    });
  }
  deleteExpense(id: string) {
    this.commit({ ...this.data, expenses: this.data.expenses.filter((item) => item.id !== id) });
  }
  addAccount(record: AccountRecord) {
    this.assertValid(validateAccount(record));
    this.assertUnique(this.data.accounts, record.id);
    this.commit({ ...this.data, accounts: [...this.data.accounts, { ...record }] });
  }
  updateAccount(record: AccountRecord) {
    this.assertValid(validateAccount(record));
    this.assertExists(this.data.accounts, record.id);
    const hasCurrencyRecords =
      this.data.income.some(
        (item) => item.accountId === record.id && item.currency !== record.currency,
      ) ||
      this.data.expenses.some(
        (item) =>
          (item.accountId === record.id || item.destinationAccountId === record.id) &&
          item.currency !== record.currency,
      );
    if (hasCurrencyRecords)
      throw new Error(
        "Currency cannot change while records in another currency refer to this account.",
      );
    this.commit({
      ...this.data,
      accounts: this.data.accounts.map((item) => (item.id === record.id ? { ...record } : item)),
    });
  }
  deleteAccount(id: string) {
    if (
      this.data.expenses.some(
        (item) => item.accountId === id || item.destinationAccountId === id,
      ) ||
      this.data.income.some((item) => item.accountId === id)
    )
      throw new Error("This account is used by a record. Reassign or remove those records first.");
    if (this.data.monitoredCards.some((card) => card.accountId === id))
      throw new Error(
        "This account is linked to a monitored card. Edit or remove that card first.",
      );
    this.commit({ ...this.data, accounts: this.data.accounts.filter((item) => item.id !== id) });
  }
  addSalaryPeriod(record: SalaryPeriod) {
    this.assertValid(validateSalaryPeriod(record));
    this.assertUnique(this.data.salaryPeriods, record.id);
    this.assertNoPeriodOverlap(record);
    this.commit({ ...this.data, salaryPeriods: [...this.data.salaryPeriods, { ...record }] });
  }
  updateSalaryPeriod(record: SalaryPeriod) {
    this.assertValid(validateSalaryPeriod(record));
    this.assertExists(this.data.salaryPeriods, record.id);
    this.assertNoPeriodOverlap(record);
    const hasCurrencyRecords =
      this.data.income.some(
        (item) => item.salaryPeriodId === record.id && item.currency !== record.currency,
      ) ||
      this.data.expenses.some(
        (item) => item.salaryPeriodId === record.id && item.currency !== record.currency,
      );
    if (hasCurrencyRecords)
      throw new Error(
        "Currency cannot change while records in another currency refer to this salary period.",
      );
    this.commit({
      ...this.data,
      salaryPeriods: this.data.salaryPeriods.map((item) =>
        item.id === record.id ? { ...record } : item,
      ),
    });
  }
  deleteSalaryPeriod(id: string) {
    if (
      this.data.income.some((item) => item.salaryPeriodId === id) ||
      this.data.expenses.some((item) => item.salaryPeriodId === id)
    )
      throw new Error(
        "This salary period is assigned to a record. Reassign or remove those records first.",
      );
    this.commit({
      ...this.data,
      salaryPeriods: this.data.salaryPeriods.filter((item) => item.id !== id),
    });
  }
  addMonitoredCard(record: MonitoredCardRecord) {
    this.assertValid(validateMonitoredCard(record));
    this.assertUnique(this.data.monitoredCards, record.id);
    this.assertCardReferences(record);
    this.commit({ ...this.data, monitoredCards: [...this.data.monitoredCards, { ...record }] });
  }
  updateMonitoredCard(record: MonitoredCardRecord) {
    this.assertValid(validateMonitoredCard(record));
    this.assertExists(this.data.monitoredCards, record.id);
    this.assertCardReferences(record);
    this.commit({
      ...this.data,
      monitoredCards: this.data.monitoredCards.map((item) =>
        item.id === record.id ? { ...record } : item,
      ),
    });
  }
  deleteMonitoredCard(id: string) {
    this.commit({
      ...this.data,
      monitoredCards: this.data.monitoredCards.filter((item) => item.id !== id),
    });
  }
  updateNotificationReaderSettings(settings: NotificationReaderSettings) {
    if (
      typeof settings.enabled !== "boolean" ||
      !Array.isArray(settings.selectedPackages) ||
      settings.selectedPackages.some((item) => typeof item !== "string" || !item.trim())
    )
      throw new Error("Notification reader settings are malformed.");
    this.commit({
      ...this.data,
      notificationReader: {
        enabled: settings.enabled,
        selectedPackages: [...new Set(settings.selectedPackages)],
      },
    });
  }
  clearAllData() {
    this.commit(emptyFinanceData());
  }
  replaceAllData(data: FinanceData) {
    this.commit({
      income: [...data.income],
      expenses: [...data.expenses],
      accounts: [...data.accounts],
      salaryPeriods: [...data.salaryPeriods],
      monitoredCards: [...(data.monitoredCards ?? [])],
      notificationReader: data.notificationReader ?? { enabled: false, selectedPackages: [] },
    });
  }

  private commit(data: FinanceData) {
    this.data = data;
    for (const listener of this.listeners) listener();
  }
  private assertValid(errors: string[]) {
    if (errors.length) throw new Error(errors.join(" "));
  }
  private assertNoPeriodOverlap(period: SalaryPeriod) {
    const overlaps = this.data.salaryPeriods.some(
      (item) =>
        item.id !== period.id &&
        item.currency === period.currency &&
        period.startsOn < item.nextSalaryOn &&
        item.startsOn < period.nextSalaryOn,
    );
    if (overlaps) throw new Error("Salary periods in the same currency cannot overlap.");
  }
  private assertCardReferences(record: MonitoredCardRecord) {
    const account =
      record.accountId && this.data.accounts.find((item) => item.id === record.accountId);
    if (record.accountId && (!account || account.currency !== record.currency))
      throw new Error("Choose an existing account with the same currency, or leave it unlinked.");
  }
  private assertIncomeReferences(record: IncomeRecord) {
    if (record.accountId) {
      const account = this.data.accounts.find((item) => item.id === record.accountId);
      if (!account || account.currency !== record.currency)
        throw new Error("Choose an existing account with the same currency.");
    }
    if (record.salaryPeriodId) {
      const period = this.data.salaryPeriods.find((item) => item.id === record.salaryPeriodId);
      if (!period || period.currency !== record.currency)
        throw new Error("Choose an existing salary period with the same currency.");
    }
  }
  private assertExpenseReferences(record: ExpenseRecord) {
    const source = record.accountId
      ? this.data.accounts.find((item) => item.id === record.accountId)
      : undefined;
    const destination = record.destinationAccountId
      ? this.data.accounts.find((item) => item.id === record.destinationAccountId)
      : undefined;
    if (record.accountId && (!source || source.currency !== record.currency))
      throw new Error("Choose an existing account with the same currency.");
    if (
      record.type === "TRANSFER" &&
      record.status === "CONFIRMED" &&
      (!source ||
        !destination ||
        source.currency !== record.currency ||
        destination.currency !== record.currency)
    )
      throw new Error("A confirmed transfer needs two existing accounts in the same currency.");
    if (record.destinationAccountId && record.type !== "TRANSFER")
      throw new Error("Only a transfer can have a destination account.");
    if (record.salaryPeriodId) {
      const period = this.data.salaryPeriods.find((item) => item.id === record.salaryPeriodId);
      if (!period || period.currency !== record.currency)
        throw new Error("Choose an existing salary period with the same currency.");
    }
  }
  private assertUnique<T extends { id: string }>(rows: T[], id: string) {
    if (rows.some((row) => row.id === id)) throw new Error("A record with this id already exists.");
  }
  private assertExists<T extends { id: string }>(rows: T[], id: string) {
    if (!rows.some((row) => row.id === id))
      throw new Error("Record was not found in the active session.");
  }
}
