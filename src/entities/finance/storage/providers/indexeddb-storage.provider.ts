import type { FinanceData } from "../../models";
import { emptyFinanceData } from "../../models";
import {
  validateAccount,
  validateExpense,
  validateIncome,
  validateSalaryPeriod,
} from "../../validation";
import { MemoryStorageProvider } from "./memory-storage.provider";
import type { StorageCapabilities, StorageProvider } from "../contracts/storage-provider";

const DATABASE_NAME = "finora-local-finance";
const DATABASE_VERSION = 1;
const STORE_NAME = "finance";
const SNAPSHOT_KEY = "current";

/** IndexedDB-backed local provider. A single structured snapshot keeps each save atomic. */
export class IndexedDbStorageProvider implements StorageProvider {
  readonly id = "LOCAL_ONLY" as const;
  readonly capabilities: StorageCapabilities = {
    inMemory: false,
    persistent: true,
    synchronization: false,
    importExport: false,
    available: true,
  };
  private readonly cache = new MemoryStorageProvider();
  private readonly listeners = new Set<() => void>();
  private database?: Promise<IDBDatabase>;
  private initialization?: Promise<void>;
  private writeQueue: Promise<void> = Promise.resolve();
  private savedData: FinanceData = emptyFinanceData();
  private persistenceFailure: Error | null = null;
  private pendingSnapshot?: FinanceData;
  private persistScheduled = false;
  private channel?: BroadcastChannel;

  get error() {
    return this.persistenceFailure;
  }
  getSnapshot = () => this.cache.getSnapshot();
  getServerSnapshot = () => emptyFinanceData();
  subscribe = (listener: () => void) => {
    const unsubscribe = this.cache.subscribe(listener);
    this.listeners.add(listener);
    return () => {
      unsubscribe();
      this.listeners.delete(listener);
    };
  };
  getIncome = () => this.cache.getIncome();
  getExpenses = () => this.cache.getExpenses();
  getAccounts = () => this.cache.getAccounts();
  getSalaryPeriods = () => this.cache.getSalaryPeriods();

  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.load();
      this.initialization.catch(() => {
        this.initialization = undefined;
      });
    }
    return this.initialization;
  }

  private async load(): Promise<void> {
    const db = await this.openDatabase();
    const stored = await readSnapshot(db);
    const data = stored ? cloneData(stored) : emptyFinanceData();
    this.savedData = data;
    this.cache.replaceAllData(data);
    if (!this.channel && typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel("finora-local-finance");
      this.channel.onmessage = (event) => {
        if (!isFinanceData(event.data)) return;
        const incoming = cloneData(event.data);
        this.savedData = incoming;
        this.cache.replaceAllData(incoming);
        this.emit();
      };
    }
  }

  addIncome(record: Parameters<StorageProvider["addIncome"]>[0]) {
    this.cache.addIncome(record);
    this.persist();
  }
  updateIncome(record: Parameters<StorageProvider["updateIncome"]>[0]) {
    this.cache.updateIncome(record);
    this.persist();
  }
  deleteIncome(id: string) {
    this.cache.deleteIncome(id);
    this.persist();
  }
  addExpense(record: Parameters<StorageProvider["addExpense"]>[0]) {
    this.cache.addExpense(record);
    this.persist();
  }
  updateExpense(record: Parameters<StorageProvider["updateExpense"]>[0]) {
    this.cache.updateExpense(record);
    this.persist();
  }
  deleteExpense(id: string) {
    this.cache.deleteExpense(id);
    this.persist();
  }
  addAccount(record: Parameters<StorageProvider["addAccount"]>[0]) {
    this.cache.addAccount(record);
    this.persist();
  }
  updateAccount(record: Parameters<StorageProvider["updateAccount"]>[0]) {
    this.cache.updateAccount(record);
    this.persist();
  }
  deleteAccount(id: string) {
    this.cache.deleteAccount(id);
    this.persist();
  }
  addSalaryPeriod(record: Parameters<StorageProvider["addSalaryPeriod"]>[0]) {
    this.cache.addSalaryPeriod(record);
    this.persist();
  }
  updateSalaryPeriod(record: Parameters<StorageProvider["updateSalaryPeriod"]>[0]) {
    this.cache.updateSalaryPeriod(record);
    this.persist();
  }
  deleteSalaryPeriod(id: string) {
    this.cache.deleteSalaryPeriod(id);
    this.persist();
  }
  clearAllData() {
    this.cache.clearAllData();
    this.persist();
  }

  /** Useful for tests and orderly teardown; browser shutdown may interrupt pending writes. */
  async flush(): Promise<void> {
    await this.writeQueue;
    if (this.persistenceFailure) throw this.persistenceFailure;
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") {
          reject(new Error("IndexedDB is unavailable in this browser."));
          return;
        }
        const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close();
            this.database = undefined;
          };
          resolve(request.result);
        };
        request.onerror = () =>
          reject(request.error ?? new Error("Could not open Finora's local database."));
        request.onblocked = () =>
          reject(new Error("Finora's local database upgrade is blocked by another open tab."));
      });
      this.database.catch(() => {
        this.database = undefined;
      });
    }
    return this.database;
  }

  private persist() {
    this.pendingSnapshot = cloneData(this.cache.getSnapshot());
    if (this.persistScheduled) return;
    this.persistScheduled = true;
    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        // Coalesce synchronous bursts (notably a CSV import) into the latest complete snapshot.
        await new Promise<void>((resolve) => queueMicrotask(resolve));
        const snapshot = this.pendingSnapshot ?? cloneData(this.cache.getSnapshot());
        this.pendingSnapshot = undefined;
        this.persistScheduled = false;
        const db = await this.openDatabase();
        await writeSnapshot(db, snapshot);
        this.savedData = snapshot;
        this.persistenceFailure = null;
        this.channel?.postMessage(snapshot);
        this.emit();
      })
      .catch((reason) => {
        this.persistScheduled = false;
        this.persistenceFailure =
          reason instanceof Error
            ? reason
            : new Error("Could not save finance data to this device.");
        // Keep UI state aligned with durable data; failed edits are not presented as saved.
        this.cache.replaceAllData(cloneData(this.savedData));
        this.emit();
      });
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

function readSnapshot(db: IDBDatabase): Promise<FinanceData | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
    request.onsuccess = () => {
      if (request.result === undefined) {
        resolve(undefined);
        return;
      }
      if (!isFinanceData(request.result)) {
        reject(
          new Error(
            "The local finance database contains invalid data. Finora did not overwrite it.",
          ),
        );
        return;
      }
      resolve(request.result);
    };
    request.onerror = () =>
      reject(request.error ?? new Error("Could not read local finance data."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Local finance read was aborted."));
  });
}

function writeSnapshot(db: IDBDatabase, data: FinanceData): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(data, SNAPSHOT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save local finance data."));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Local finance save was aborted."));
  });
}

function cloneData(data: FinanceData): FinanceData {
  return {
    income: data.income.map((item) => ({ ...item })),
    expenses: data.expenses.map((item) => ({ ...item })),
    accounts: data.accounts.map((item) => ({ ...item })),
    salaryPeriods: data.salaryPeriods.map((item) => ({ ...item })),
  };
}

function isFinanceData(value: unknown): value is FinanceData {
  if (value === null || typeof value !== "object") return false;
  const data = value as Partial<FinanceData>;
  if (
    !Array.isArray(data.income) ||
    !Array.isArray(data.expenses) ||
    !Array.isArray(data.accounts) ||
    !Array.isArray(data.salaryPeriods)
  )
    return false;
  if (
    data.income.some((item) => validateIncome(item).length > 0) ||
    data.expenses.some((item) => validateExpense(item).length > 0) ||
    data.accounts.some((item) => validateAccount(item).length > 0) ||
    data.salaryPeriods.some((item) => validateSalaryPeriod(item).length > 0)
  )
    return false;
  const groups = [data.income, data.expenses, data.accounts, data.salaryPeriods];
  return groups.every((group) => new Set(group.map((item) => item.id)).size === group.length);
}
