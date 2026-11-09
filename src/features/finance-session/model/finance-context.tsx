"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Image from "next/image";
import financeIcon from "@/shared/assets/icon.svg";
import type {
  AccountRecord,
  ExpenseRecord,
  FinanceData,
  IncomeRecord,
  MonitoredCardRecord,
  NotificationReaderSettings,
  SalaryPeriod,
} from "@/entities/finance";
import {
  IndexedDbStorageProvider,
  StorageManager,
  type StorageCapabilities,
  type StorageMode,
} from "@/entities/finance";

class FinanceSession {
  readonly manager = new StorageManager();
  initialize = () => this.manager.initialize();
  getSnapshot = () => this.manager.activeProvider.getSnapshot();
  getStorageError = () =>
    this.manager.activeProvider instanceof IndexedDbStorageProvider
      ? (this.manager.activeProvider.error?.message ?? null)
      : null;
  getServerSnapshot = () => EMPTY_DATA;
  subscribe = (notify: () => void) => this.manager.activeProvider.subscribe(notify);

  addIncome(record: IncomeRecord) {
    this.manager.activeProvider.addIncome(record);
  }
  updateIncome(record: IncomeRecord) {
    this.manager.activeProvider.updateIncome(record);
  }
  deleteIncome(id: string) {
    this.manager.activeProvider.deleteIncome(id);
  }
  addExpense(record: ExpenseRecord) {
    this.manager.activeProvider.addExpense(record);
  }
  updateExpense(record: ExpenseRecord) {
    this.manager.activeProvider.updateExpense(record);
  }
  deleteExpense(id: string) {
    this.manager.activeProvider.deleteExpense(id);
  }
  addAccount(record: AccountRecord) {
    this.manager.activeProvider.addAccount(record);
  }
  updateAccount(record: AccountRecord) {
    this.manager.activeProvider.updateAccount(record);
  }
  deleteAccount(id: string) {
    this.manager.activeProvider.deleteAccount(id);
  }
  addSalaryPeriod(record: SalaryPeriod) {
    this.manager.activeProvider.addSalaryPeriod(record);
  }
  updateSalaryPeriod(record: SalaryPeriod) {
    this.manager.activeProvider.updateSalaryPeriod(record);
  }
  deleteSalaryPeriod(id: string) {
    this.manager.activeProvider.deleteSalaryPeriod(id);
  }
  addMonitoredCard(record: MonitoredCardRecord) {
    this.manager.activeProvider.addMonitoredCard(record);
  }
  updateMonitoredCard(record: MonitoredCardRecord) {
    this.manager.activeProvider.updateMonitoredCard(record);
  }
  deleteMonitoredCard(id: string) {
    this.manager.activeProvider.deleteMonitoredCard(id);
  }
  updateNotificationReaderSettings(settings: NotificationReaderSettings) {
    this.manager.activeProvider.updateNotificationReaderSettings(settings);
  }
  clearAllData() {
    this.manager.activeProvider.clearAllData();
  }
  selectStorageMode(mode: StorageMode, confirmed = false) {
    this.manager.select(mode, confirmed);
  }
}

const EMPTY_DATA: FinanceData = {
  income: [],
  expenses: [],
  accounts: [],
  salaryPeriods: [],
  monitoredCards: [],
  notificationReader: { enabled: false, selectedPackages: [] },
};
interface FinanceContextValue {
  data: FinanceData;
  session: FinanceSession;
  storageMode: StorageMode;
  storageProviders: Array<{ id: StorageMode; capabilities: StorageCapabilities }>;
  ready: boolean;
  storageError: string | null;
}
const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [session] = useState(() => new FinanceSession());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const data = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getServerSnapshot,
  );
  useEffect(() => {
    let active = true;
    void session
      .initialize()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((reason) => {
        if (active) {
          setStorageError(
            reason instanceof Error ? reason.message : "Could not open local storage.",
          );
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, [session]);
  const effectiveError = storageError ?? session.getStorageError();
  const value = useMemo(
    () => ({
      data,
      session,
      storageMode: session.manager.mode,
      storageProviders: session.manager.providerList,
      ready,
      storageError: effectiveError,
    }),
    [data, session, ready, effectiveError],
  );
  if (!ready)
    return (
      <StorageStatus
        title="Getting Finora ready"
        detail="Your private money workspace is loading on this device."
        loading
      />
    );
  if (storageError)
    return (
      <StorageStatus
        title="We couldn’t open your local data"
        detail={`Finora couldn’t access this browser’s storage: ${storageError}`}
      />
    );
  if (effectiveError)
    return (
      <StorageStatus
        title="Your latest change wasn’t saved"
        detail={`${effectiveError} Check your browser storage, then reload Finora.`}
      />
    );
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

function StorageStatus({
  title,
  detail,
  loading = false,
}: {
  title: string;
  detail: string;
  loading?: boolean;
}) {
  return (
    <main
      className="storage-gate"
      role={loading ? "status" : "alert"}
      aria-live={loading ? "polite" : "assertive"}
    >
      <section className="storage-gate-card">
        <div
          className={`storage-gate-mark${loading ? " is-loading" : " is-error"}`}
          aria-hidden="true"
        >
          {loading ? <Image src={financeIcon} alt="" width={60} height={60} /> : <b>!</b>}
        </div>
        <div className="storage-gate-brand">FINORA</div>
        <h1>{title}</h1>
        <p>{detail}</p>
        {loading && (
          <span className="storage-gate-footnote">Your data stays on this device</span>
        )}
      </section>
    </main>
  );
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("useFinance must be used inside FinanceProvider.");
  return value;
}
