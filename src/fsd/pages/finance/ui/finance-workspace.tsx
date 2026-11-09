"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { App } from "@capacitor/app";
import { AnimatePresence, motion } from "motion/react";
import {
  calculateBudget,
  currentSalaryPeriod,
  previewCsvImport,
  type AccountRecord,
  type ExpenseRecord,
  type ExpenseBudgetMode,
  type IncomeRecord,
  type SalaryPeriod,
} from "@/entities/finance";
import { useFinance } from "@/features/finance-session";
import { AccountFormDialog } from "@/features/manage-accounts";
import { IncomeFormDialog } from "@/features/manage-income";
import { SalaryPeriodFormDialog } from "@/features/manage-salary-periods";
import { TransactionFormDialog } from "@/features/manage-transactions";
import { ThemeSwitcher } from "@/features/theme-switcher";
import { PwaInstallButton } from "@/widgets/pwa-controls";
import { exitNativeApp, useAndroidBackButton, useFinoraAppUrlOpen } from "@/lib/native";
import { routeTransition, routeVariants } from "@/shared/lib/motion";
import type { StorageMode } from "@/entities/finance";
import type { View } from "./finance.types";
import { Icon } from "./finance-page-shared";
import { Overview } from "./overview-page";
import { IncomePage } from "./income-page";
import { TransactionsPage } from "./transactions-page";
import { AccountsPage } from "./accounts-page";
import { AnalyticsPage } from "./analytics-page";
import { IntegrationsPage } from "./integrations-page";
import { SettingsPage } from "./settings-page";
import { SalaryPeriodsPage } from "./salary-periods-page";
import {
  notificationReader,
  ReaderTransactionDialog,
  type DetectedTransaction,
} from "@/features/integrations";

type Dialog = "income" | "expense" | "account" | "salary" | "reader" | null;
const viewPaths = {
  Overview: "/",
  Transactions: "/transactions",
  Income: "/income",
  Accounts: "/accounts",
  "Salary periods": "/salary-periods",
  Analytics: "/analytics",
  Integrations: "/integrations",
  Settings: "/settings",
} as const satisfies Record<View, string>;

function normalizeRoutePath(pathname: string) {
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  return withoutTrailingSlash || "/";
}

function viewForPath(pathname: string): View {
  switch (normalizeRoutePath(pathname)) {
    case "/transactions":
      return "Transactions";
    case "/income":
      return "Income";
    case "/accounts":
      return "Accounts";
    case "/salary-periods":
      return "Salary periods";
    case "/analytics":
      return "Analytics";
    case "/integrations":
      return "Integrations";
    case "/settings":
      return "Settings";
    default:
      return "Overview";
  }
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
const subscribeToDate = (onDateChange: () => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  const scheduleNextDateChange = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    timeout = setTimeout(() => {
      onDateChange();
      scheduleNextDateChange();
    }, nextMidnight.getTime() - now.getTime());
  };
  scheduleNextDateChange();
  return () => clearTimeout(timeout);
};
const serverDate = () => "";
export function FinanceWorkspace({ view: routeView }: { view?: View } = {}) {
  const { data, session, storageMode, storageProviders } = useFinance();
  const router = useRouter();
  const pathname = usePathname();
  const routeSearch = useSearchParams();
  const view = routeView ?? viewForPath(pathname);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathnameRef = useRef(pathname);
  const [editingIncome, setEditingIncome] = useState<IncomeRecord | undefined>();
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | undefined>();
  const [expenseBudgetMode, setExpenseBudgetMode] = useState<ExpenseBudgetMode>("GLOBAL");
  const [editingAccount, setEditingAccount] = useState<AccountRecord | undefined>();
  const [editingSalary, setEditingSalary] = useState<SalaryPeriod | undefined>();
  const [detectedTransactions, setDetectedTransactions] = useState<DetectedTransaction[]>([]);
  const [reviewCandidate, setReviewCandidate] = useState<DetectedTransaction>();
  const autoPromptedCandidates = useRef(new Set<string>());
  const query = routeSearch.get("q") ?? "";
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const today = useSyncExternalStore(subscribeToDate, localDate, serverDate);
  useEffect(() => {
    if (!notificationReader.isAvailable()) return;
    let active = true;
    let transactionListener: { remove: () => Promise<void> } | undefined;
    let appStateListener: { remove: () => Promise<void> } | undefined;
    const refreshPending = async () => {
      const result = await notificationReader
        .getPendingCandidates()
        .catch(() => ({ candidates: [] }));
      if (!active) return;
      setDetectedTransactions((current) => {
        const merged = new Map(current.map((candidate) => [candidate.id, candidate]));
        for (const candidate of result.candidates) merged.set(candidate.id, candidate);
        return [...merged.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      });
    };
    void refreshPending();
    void notificationReader
      .addListener((candidate) => {
        if (!active) return;
        setDetectedTransactions((current) => [
          candidate,
          ...current.filter((item) => item.id !== candidate.id),
        ]);
      })
      .then((handle) => {
        if (active) transactionListener = handle;
        else void handle.remove();
      })
      .catch((reason: unknown) => {
        console.error("Could not subscribe to transaction reader events.", reason);
      });
    void App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) void refreshPending();
    }).then((handle) => {
      if (active) appStateListener = handle;
      else void handle.remove();
    });
    return () => {
      active = false;
      void transactionListener?.remove();
      void appStateListener?.remove();
    };
  }, []);
  useEffect(() => {
    if (!notificationReader.isAvailable()) return;
    void Promise.all([
      notificationReader.setMonitoringEnabled(data.notificationReader.enabled),
      notificationReader.setSelectedPackages(data.notificationReader.selectedPackages),
      notificationReader.setMonitoredCards(data.monitoredCards),
    ]).catch((reason: unknown) => {
      console.error("Could not sync local notification reader settings.", reason);
    });
  }, [data.monitoredCards, data.notificationReader]);
  useEffect(() => {
    if (dialog !== null) return;
    const next = detectedTransactions.find(
      (candidate) => !autoPromptedCandidates.current.has(candidate.id),
    );
    if (!next) return;
    autoPromptedCandidates.current.add(next.id);
    setReviewCandidate(next);
    setDialog("reader");
  }, [detectedTransactions, dialog]);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMobileNavOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen]);
  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;
    previousPathnameRef.current = pathname;
    document.getElementById("page-heading")?.focus();
  }, [pathname]);
  useAndroidBackButton(({ canGoBack }) => {
    if (dialog) {
      setDialog(null);
      return;
    }
    if (mobileNavOpen) {
      setMobileNavOpen(false);
      mobileMenuButtonRef.current?.focus();
      return;
    }
    if (canGoBack) {
      router.back();
      return;
    }
    void exitNativeApp().catch((reason: unknown) => {
      console.error("Could not close Finora.", reason);
    });
  });
  useFinoraAppUrlOpen((path) => {
    if (path !== pathname) router.replace(path);
  });
  const activeSalary = currentSalaryPeriod(data, today);
  const summary = activeSalary ? calculateBudget(data, activeSalary, today) : undefined;
  const filteredExpenses = useMemo(
    () =>
      data.expenses
        .filter((item) =>
          `${item.description} ${item.category}`
            .toLocaleLowerCase()
            .includes(query.toLocaleLowerCase()),
        )
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    [data.expenses, query],
  );
  const expectedIncome = data.income
    .filter((item) => item.status === "EXPECTED")
    .sort((a, b) => (a.expectedOn || "9999").localeCompare(b.expectedOn || "9999"));
  const navigateToView = (nextView: View) => {
    const path = viewPaths[nextView];
    router.push(path);
  };
  const setQuery = (value: string) => {
    const search = new URLSearchParams();
    if (value) search.set("q", value);
    router.replace(`/transactions${search.size ? `?${search}` : ""}`);
  };
  const flash = (message: string) => {
    setError("");
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };
  const showError = (value: unknown) => {
    setNotice("");
    setError(value instanceof Error ? value.message : "The change could not be saved.");
  };
  const openIncome = (item?: IncomeRecord) => {
    setEditingIncome(item);
    setDialog("income");
    setError("");
  };
  const openExpense = (item?: ExpenseRecord, budgetMode?: ExpenseBudgetMode) => {
    setEditingExpense(item);
    setExpenseBudgetMode(item?.budgetMode ?? budgetMode ?? "GLOBAL");
    setDialog("expense");
    setError("");
  };
  const openAccount = (item?: AccountRecord) => {
    setEditingAccount(item);
    setDialog("account");
    setError("");
  };
  const openSalary = (item?: SalaryPeriod) => {
    setEditingSalary(item);
    setDialog("salary");
    setError("");
  };
  const clearSession = () => {
    if (
      !window.confirm(
        "Permanently clear all Finora income, transactions, accounts and salary periods stored on this device? This cannot be undone.",
      )
    )
      return;
    session.clearAllData();
    if (notificationReader.isAvailable())
      void notificationReader.clearPendingCandidates().catch((reason: unknown) => {
        console.error("Could not clear pending transaction notifications.", reason);
      });
    setDetectedTransactions([]);
    setReviewCandidate(undefined);
    setDialog(null);
    setEditingIncome(undefined);
    setEditingExpense(undefined);
    setEditingAccount(undefined);
    setEditingSalary(undefined);
    setError("");
    flash("All local finance data cleared from this device");
  };
  const handleStorageMode = (mode: StorageMode) => {
    try {
      session.selectStorageMode(mode);
    } catch (reason) {
      showError(reason);
    }
  };
  const dismissDetectedTransaction = async (candidate: DetectedTransaction) => {
    try {
      if (notificationReader.isAvailable()) await notificationReader.dismissCandidate(candidate.id);
      setDetectedTransactions((current) => current.filter((item) => item.id !== candidate.id));
      if (reviewCandidate?.id === candidate.id) {
        setReviewCandidate(undefined);
        setDialog(null);
      }
    } catch (reason) {
      showError(reason);
    }
  };
  const reviewDetectedTransaction = (candidate: DetectedTransaction) => {
    autoPromptedCandidates.current.add(candidate.id);
    setReviewCandidate(candidate);
    setDialog("reader");
  };
  const saveDetectedTransaction = async (record: ExpenseRecord) => {
    if (!reviewCandidate) return;
    try {
      const candidate = reviewCandidate;
      if (!data.expenses.some((item) => item.externalReference === candidate.id))
        session.addExpense(record);
      if (notificationReader.isAvailable()) await notificationReader.dismissCandidate(candidate.id);
      setDetectedTransactions((current) => current.filter((item) => item.id !== candidate.id));
      setReviewCandidate(undefined);
      setDialog(null);
      flash("Detected transaction confirmed and saved");
    } catch (reason) {
      showError(reason);
    }
  };
  const importCsv = async (file?: File) => {
    if (!file) return;
    try {
      const preview = previewCsvImport(await file.text(), data.expenses);
      for (const record of preview.records) session.addExpense(record);
      const message = `${preview.records.length} transaction candidate${preview.records.length === 1 ? "" : "s"} added to review.`;
      flash(
        preview.issues.length
          ? `${message} ${preview.issues.length} row${preview.issues.length === 1 ? "" : "s"} need attention.`
          : message,
      );
    } catch (reason) {
      showError(reason);
    }
  };

  const nav: Array<[View, string, (typeof viewPaths)[View]]> = [
    ["Overview", "grid", viewPaths.Overview],
    ["Transactions", "arrows", viewPaths.Transactions],
    ["Income", "chart", viewPaths.Income],
    ["Accounts", "wallet", viewPaths.Accounts],
    ["Salary periods", "chart", viewPaths["Salary periods"]],
    ["Analytics", "chart", viewPaths.Analytics],
    ["Integrations", "bank", viewPaths.Integrations],
    ["Settings", "settings", viewPaths.Settings],
  ];
  const heading = view === "Overview" ? "Today's budget" : view;
  const pendingCount = data.expenses.filter(
    (item) => item.reviewStatus === "PENDING_REVIEW",
  ).length;

  return (
    <div className="app-shell">
      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={() => {
            setMobileNavOpen(false);
            mobileMenuButtonRef.current?.focus();
          }}
        />
      )}
      <aside className={`sidebar${mobileNavOpen ? " mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            f
          </div>
          <span>finora</span>
          <span className="brand-dot" aria-hidden="true">
            .
          </span>
        </div>
        <div className="workspace-label">FINANCIAL SPACE</div>
        <nav id="main-navigation" className="nav-list" aria-label="Main navigation">
          {nav.map(([item, icon, path]) => (
            <Link
              key={item}
              href={path}
              className={`nav-item ${view === item ? "active" : ""}`}
              aria-current={normalizeRoutePath(pathname) === path ? "page" : undefined}
              onClick={() => setMobileNavOpen(false)}
            >
              <Icon name={icon} />
              <span>{item}</span>
              {item === "Transactions" && pendingCount > 0 && (
                <i aria-label={`${pendingCount} pending transactions`} className="nav-count">
                  {pendingCount}
                </i>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-rail">
            <span>
              <Icon name="shield" size={15} />
            </span>
            <div>
              <b>Local-only storage</b>
              <small>Saved on this device</small>
            </div>
          </div>
        </div>
      </aside>
      <main id="main-content" className="main-area" tabIndex={-1}>
        <header className="topbar">
          <button
            ref={mobileMenuButtonRef}
            className="mobile-menu-button"
            type="button"
            aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileNavOpen}
            aria-controls="main-navigation"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="breadcrumbs">
            <span>Finora</span>
            <Icon name="chevron" size={14} />
            <b>{view}</b>
          </div>
          <div className="top-actions">
            <PwaInstallButton />
            <ThemeSwitcher />
          </div>
        </header>
        <div className="page-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={routeVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={routeTransition}
            >
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    {view === "Overview" && today
                      ? new Intl.DateTimeFormat("en", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        }).format(new Date(`${today}T12:00:00`))
                      : "PRIVATE FINANCIAL WORKSPACE"}
                  </div>
                  <h1 id="page-heading" tabIndex={-1}>
                    {heading}
                  </h1>
                  {view === "Overview" && (
                    <p className="subtitle">
                      See how much you can spend today, then the rest of your period.
                    </p>
                  )}
                </div>
                <div className="heading-actions">
                  {view !== "Settings" && view !== "Integrations" && (
                    <button
                      className="primary-button"
                      aria-label="Add expense"
                      onClick={() => openExpense()}
                    >
                      <Icon name="plus" size={17} />{" "}
                      <span className="hidden lg:block">Add expense</span>
                    </button>
                  )}
                </div>
              </div>

              {view === "Overview" && (
                <Overview
                  data={data}
                  summary={summary}
                  activeSalary={activeSalary}
                  expectedIncome={expectedIncome}
                  onIncome={() => openIncome()}
                  onExpense={(budgetMode) => openExpense(undefined, budgetMode)}
                  onSalary={() => openSalary()}
                  onView={navigateToView}
                  onEditExpense={openExpense}
                  onDeleteExpense={(item) => {
                    try {
                      session.deleteExpense(item.id);
                      flash("Transaction removed from this device");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onConfirmExpense={(item) => {
                    try {
                      session.updateExpense({
                        ...item,
                        status: "CONFIRMED",
                        reviewStatus: "CONFIRMED",
                      });
                      flash("Transaction confirmed");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onRejectExpense={(item) => {
                    try {
                      session.updateExpense({
                        ...item,
                        status: "CANCELLED",
                        reviewStatus: "REJECTED",
                      });
                      flash("Transaction rejected");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                />
              )}
              {view === "Income" && (
                <IncomePage
                  data={data}
                  onAdd={() => openIncome()}
                  onEdit={openIncome}
                  onDelete={(item) => {
                    try {
                      session.deleteIncome(item.id);
                      flash("Income removed from this device");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onConfirm={(item) => {
                    try {
                      session.updateIncome({
                        ...item,
                        status: "RECEIVED",
                        receivedOn: item.receivedOn || today,
                      });
                      flash("Income confirmed");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                />
              )}
              {view === "Transactions" && (
                <TransactionsPage
                  items={filteredExpenses}
                  query={query}
                  setQuery={setQuery}
                  onImport={importCsv}
                  onAdd={() => openExpense()}
                  onEdit={openExpense}
                  onDelete={(item) => {
                    try {
                      session.deleteExpense(item.id);
                      flash("Transaction removed from this device");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onConfirm={(item) => {
                    try {
                      session.updateExpense({
                        ...item,
                        status: "CONFIRMED",
                        reviewStatus: "CONFIRMED",
                      });
                      flash("Transaction confirmed");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onReject={(item) => {
                    try {
                      session.updateExpense({
                        ...item,
                        status: "CANCELLED",
                        reviewStatus: "REJECTED",
                      });
                      flash("Transaction rejected");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  accounts={data.accounts}
                />
              )}
              {view === "Accounts" && (
                <AccountsPage
                  data={data}
                  onAdd={() => openAccount()}
                  onEdit={openAccount}
                  onDelete={(item) => {
                    try {
                      session.deleteAccount(item.id);
                      flash("Account removed from this device");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                />
              )}
              {view === "Salary periods" && (
                <SalaryPeriodsPage
                  periods={data.salaryPeriods}
                  data={data}
                  today={today}
                  onAdd={() => openSalary()}
                  onEdit={openSalary}
                  onDelete={(item) => {
                    try {
                      session.deleteSalaryPeriod(item.id);
                      flash("Salary period removed");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                />
              )}
              {view === "Analytics" && (
                <AnalyticsPage data={data} summary={summary} onSalary={() => openSalary()} />
              )}
              {view === "Integrations" && <IntegrationsPage onImport={importCsv} />}
              {view === "Settings" && (
                <SettingsPage
                  mode={storageMode}
                  providers={storageProviders}
                  salaryPeriods={data.salaryPeriods}
                  accounts={data.accounts}
                  monitoredCards={data.monitoredCards}
                  notificationReader={data.notificationReader}
                  detectedTransactions={detectedTransactions}
                  recentReaderTransactions={data.expenses
                    .filter((item) => item.source === "BANK_SYNC" || item.source === "WALLET_SYNC")
                    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
                    .slice(0, 5)}
                  onMode={handleStorageMode}
                  onClear={clearSession}
                  onSalary={() => openSalary()}
                  onEditSalary={openSalary}
                  onDeleteSalary={(item) => {
                    try {
                      session.deleteSalaryPeriod(item.id);
                      flash("Salary period removed");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onReaderSettings={(settings) => {
                    try {
                      session.updateNotificationReaderSettings(settings);
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onAddMonitoredCard={(card) => {
                    try {
                      session.addMonitoredCard(card);
                      flash("Card added to notification reader");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onEditMonitoredCard={(card) => {
                    try {
                      session.updateMonitoredCard(card);
                      flash("Card settings updated");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onDeleteMonitoredCard={(card) => {
                    if (!window.confirm(`Remove ${card.name} from notification matching?`)) return;
                    try {
                      session.deleteMonitoredCard(card.id);
                      flash("Monitored card removed");
                    } catch (reason) {
                      showError(reason);
                    }
                  }}
                  onReviewDetectedTransaction={reviewDetectedTransaction}
                  onDismissDetectedTransaction={(candidate) =>
                    void dismissDetectedTransaction(candidate)
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      {error && (
        <div className="toast error-toast" role="alert">
          <span>!</span>
          {error}
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>✓</span>
          {notice}
        </div>
      )}
      {dialog === "income" && (
        <IncomeFormDialog
          initial={editingIncome}
          salaryPeriods={data.salaryPeriods}
          accounts={data.accounts}
          onClose={() => setDialog(null)}
          onSave={(record) => {
            try {
              if (editingIncome) session.updateIncome(record);
              else session.addIncome(record);
              setDialog(null);
              flash(editingIncome ? "Income updated" : "Income added");
            } catch (reason) {
              showError(reason);
            }
          }}
        />
      )}
      {dialog === "expense" && (
        <TransactionFormDialog
          initial={editingExpense}
          defaultBudgetMode={expenseBudgetMode}
          accounts={data.accounts}
          onClose={() => setDialog(null)}
          onSave={(record) => {
            try {
              if (editingExpense) session.updateExpense(record);
              else session.addExpense(record);
              setDialog(null);
              flash(editingExpense ? "Transaction updated" : "Transaction added");
            } catch (reason) {
              showError(reason);
            }
          }}
        />
      )}
      {dialog === "account" && (
        <AccountFormDialog
          initial={editingAccount}
          onClose={() => setDialog(null)}
          onSave={(record) => {
            try {
              if (editingAccount) session.updateAccount(record);
              else session.addAccount(record);
              setDialog(null);
              flash(editingAccount ? "Account updated" : "Account added");
            } catch (reason) {
              showError(reason);
            }
          }}
        />
      )}
      {dialog === "salary" && (
        <SalaryPeriodFormDialog
          initial={editingSalary}
          onClose={() => setDialog(null)}
          onSave={(record) => {
            try {
              if (editingSalary) session.updateSalaryPeriod(record);
              else session.addSalaryPeriod(record);
              setDialog(null);
              flash(editingSalary ? "Salary period updated" : "Salary period configured");
            } catch (reason) {
              showError(reason);
            }
          }}
        />
      )}
      {dialog === "reader" && reviewCandidate && (
        <ReaderTransactionDialog
          candidate={reviewCandidate}
          cards={data.monitoredCards}
          accounts={data.accounts}
          onClose={() => {
            setReviewCandidate(undefined);
            setDialog(null);
          }}
          onIgnore={() => void dismissDetectedTransaction(reviewCandidate)}
          onSave={(record) => void saveDetectedTransaction(record)}
        />
      )}
    </div>
  );
}
