import type { FinanceData } from "../models";
import type { StorageMode, StorageProvider } from "./contracts/storage-provider";
import { IndexedDbStorageProvider } from "./providers/indexeddb-storage.provider";
import { PlannedStorageProvider } from "./providers/planned-storage.provider";

export class StorageManager {
  private readonly providers: Record<StorageMode, StorageProvider>;
  private activeMode: StorageMode = "LOCAL_ONLY";

  constructor(local: StorageProvider = new IndexedDbStorageProvider()) {
    this.providers = {
      LOCAL_ONLY: local,
      PRIVATE_CLOUD: new PlannedStorageProvider("PRIVATE_CLOUD"),
      CUSTOM_DATABASE: new PlannedStorageProvider("CUSTOM_DATABASE"),
    };
  }

  get mode() {
    return this.activeMode;
  }
  get activeProvider() {
    return this.providers[this.activeMode];
  }
  get providerList() {
    return Object.values(this.providers).map((provider) => ({
      id: provider.id,
      capabilities: provider.capabilities,
    }));
  }
  initialize() {
    return this.activeProvider.initialize();
  }

  select(mode: StorageMode, confirmMigration = false) {
    if (mode === this.activeMode) return;
    const destination = this.providers[mode];
    if (!destination.capabilities.available)
      throw new Error(`${mode.replace(/_/g, " ")} is planned and cannot be selected yet.`);
    const currentData = this.activeProvider.getSnapshot();
    if (hasFinancialData(currentData) && !confirmMigration)
      throw new Error(
        "Confirm a reviewed migration before changing storage. No data has been moved.",
      );
    throw new Error("No alternate storage provider is currently available.");
  }
}

function hasFinancialData(data: FinanceData) {
  return (
    data.income.length + data.expenses.length + data.accounts.length + data.salaryPeriods.length > 0
  );
}
