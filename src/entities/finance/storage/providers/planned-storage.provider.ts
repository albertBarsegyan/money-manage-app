import type {
  FutureStorageProvider,
  StorageCapabilities,
  StorageMode,
} from "../contracts/storage-provider";
import type {
  AccountRecord,
  ExpenseRecord,
  FinanceData,
  IncomeRecord,
  SalaryPeriod,
} from "../../models";

/** Explicit unavailable boundaries; these providers never claim to connect or store data. */
export class PlannedStorageProvider implements FutureStorageProvider {
  readonly capabilities: StorageCapabilities = {
    inMemory: false,
    persistent: true,
    synchronization: this.id === "PRIVATE_CLOUD",
    importExport: true,
    available: false,
  };
  constructor(readonly id: Exclude<StorageMode, "LOCAL_ONLY">) {}
  async initialize(): Promise<void> {
    return unavailable();
  }
  async migrateFrom(_data: FinanceData, _confirmed: boolean): Promise<void> {
    throw new Error(`${this.id} storage is not implemented.`);
  }
  getSnapshot(): FinanceData {
    return unavailable();
  }
  subscribe(_listener: () => void): () => void {
    return unavailable();
  }
  getIncome(): IncomeRecord[] {
    return unavailable();
  }
  addIncome(_record: IncomeRecord): void {
    return unavailable();
  }
  updateIncome(_record: IncomeRecord): void {
    return unavailable();
  }
  deleteIncome(_id: string): void {
    return unavailable();
  }
  getExpenses(): ExpenseRecord[] {
    return unavailable();
  }
  addExpense(_record: ExpenseRecord): void {
    return unavailable();
  }
  updateExpense(_record: ExpenseRecord): void {
    return unavailable();
  }
  deleteExpense(_id: string): void {
    return unavailable();
  }
  getAccounts(): AccountRecord[] {
    return unavailable();
  }
  addAccount(_record: AccountRecord): void {
    return unavailable();
  }
  updateAccount(_record: AccountRecord): void {
    return unavailable();
  }
  deleteAccount(_id: string): void {
    return unavailable();
  }
  getSalaryPeriods(): SalaryPeriod[] {
    return unavailable();
  }
  addSalaryPeriod(_record: SalaryPeriod): void {
    return unavailable();
  }
  updateSalaryPeriod(_record: SalaryPeriod): void {
    return unavailable();
  }
  deleteSalaryPeriod(_id: string): void {
    return unavailable();
  }
  clearAllData(): void {
    return unavailable();
  }
}

function unavailable(): never {
  throw new Error("This storage mode is planned and unavailable.");
}
