import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  calculateAccountBalance,
  calculateBudget,
  currentSalaryPeriod,
} from "../src/entities/finance/calculations/budget";
import { formatMoney, parseMoney } from "../src/entities/finance/calculations/money";
import { previewCsvImport } from "../src/entities/finance/csv-import";
import { createExportEnvelope, previewImport } from "../src/entities/finance/export-format";
import {
  NotificationCandidateInbox,
  type AndroidNotificationParser,
} from "../src/features/integrations/android-notifications";
import {
  emptyFinanceData,
  type AccountRecord,
  type ExpenseRecord,
  type IncomeRecord,
  type SalaryPeriod,
} from "../src/entities/finance/models";
import { MemoryStorageProvider } from "../src/entities/finance/storage/providers/memory-storage.provider";
import { IndexedDbStorageProvider } from "../src/entities/finance/storage/providers/indexeddb-storage.provider";
import { StorageManager } from "../src/entities/finance/storage/storage-manager";

const period: SalaryPeriod = {
  id: "period-1",
  name: "Pay period",
  currency: "AMD",
  startsOn: "2026-01-01",
  nextSalaryOn: "2026-01-31",
  recurrence: "MONTHLY",
};
const receivedIncome: IncomeRecord = {
  id: "income-1",
  source: "SALARY",
  description: "Entered salary",
  amountMinor: 10_000,
  currency: "AMD",
  receivedOn: "2026-01-01",
  salaryPeriodId: period.id,
  status: "RECEIVED",
};
function tx(overrides: Partial<ExpenseRecord>): ExpenseRecord {
  return {
    id: "tx",
    amountMinor: 1_000,
    currency: "AMD",
    category: "Food",
    occurredAt: "2026-01-08T12:00",
    description: "Entered transaction",
    status: "CONFIRMED",
    type: "EXPENSE",
    source: "MANUAL",
    reviewStatus: "CONFIRMED",
    ...overrides,
  };
}

test("money entry parses to integer minor units without floating point accumulation", () => {
  assert.equal(parseMoney("123456789012.34", "AMD"), 12_345_678_901_234);
  assert.equal(parseMoney("0.10", "USD"), 10);
  assert.equal(parseMoney("1.239", "USD"), null);
  assert.equal(parseMoney("-2.00", "AMD"), null);
  assert.equal(parseMoney("1e4", "AMD"), null);
  assert.match(formatMoney({ amountMinor: 123, currency: "USD" }, "en-US"), /1\.23/);
});

test("budget includes only received income and confirmed same-currency activity", () => {
  const data = emptyFinanceData();
  data.salaryPeriods.push(period);
  data.income.push(receivedIncome, {
    ...receivedIncome,
    id: "expected",
    amountMinor: 90_000,
    receivedOn: undefined,
    expectedOn: "2026-01-20",
    status: "EXPECTED",
  });
  data.expenses.push(
    tx({ id: "confirmed", amountMinor: 3_000 }),
    tx({ id: "pending", amountMinor: 7_000, status: "PENDING", reviewStatus: "PENDING_REVIEW" }),
    tx({ id: "cancelled", amountMinor: 1_000, status: "CANCELLED", reviewStatus: "REJECTED" }),
    tx({ id: "refund", amountMinor: 500, type: "REFUND" }),
    tx({ id: "extra-income", amountMinor: 2_000, type: "INCOME" }),
    tx({ id: "transfer", amountMinor: 1_500, type: "TRANSFER" }),
    tx({ id: "other-currency", amountMinor: 50_000, currency: "USD" }),
    tx({ id: "payday", amountMinor: 20_000, occurredAt: "2026-01-31T10:00" }),
  );
  const result = calculateBudget(data, period, "2026-01-16");
  assert.equal(result.confirmedIncomeMinor, 12_000);
  assert.equal(result.confirmedExpensesMinor, 3_000);
  assert.equal(result.refundsMinor, 500);
  assert.equal(result.remainingMinor, 9_500);
  assert.equal(result.daysUntilSalary, 15);
  assert.equal(result.dailyBaseAllowanceMinor, 400);
  assert.equal(result.previousCarryoverMinor, 3_500);
  assert.equal(result.availableTodayMinor, 3_900);
  assert.equal(result.spentTodayMinor, 0);
  assert.equal(result.remainingTodayMinor, 3_900);
  assert.deepEqual(result.categoryTotals, [{ category: "Food", amountMinor: 3_000 }]);
});

test("daily allowance carries savings forward and reconciles confirmed spending at day end", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(tx({ id: "today", amountMinor: 2_500, occurredAt: "2026-01-04T12:00" }));

  const today = calculateBudget(data, period, "2026-01-04");
  assert.equal(today.dailyBaseAllowanceMinor, 1_000);
  assert.equal(today.previousCarryoverMinor, 3_000);
  assert.equal(today.availableTodayMinor, 4_000);
  assert.equal(today.spentTodayMinor, 2_500);
  assert.equal(today.remainingTodayMinor, 1_500);

  const tomorrow = calculateBudget(data, period, "2026-01-05");
  assert.equal(tomorrow.previousCarryoverMinor, today.remainingTodayMinor);
  assert.equal(tomorrow.availableTodayMinor, 2_500);
  assert.deepEqual(today, calculateBudget(data, period, "2026-01-04"));
});

test("daily carryover replays edited and deleted history without changing today's base", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({ id: "historical", amountMinor: 500, occurredAt: "2026-01-02T12:00" }),
    tx({ id: "today", amountMinor: 2_500, occurredAt: "2026-01-04T12:00" }),
  );

  const afterHistoricalSpend = calculateBudget(data, period, "2026-01-04");
  assert.equal(afterHistoricalSpend.dailyBaseAllowanceMinor, 1_000);
  assert.equal(afterHistoricalSpend.previousCarryoverMinor, 2_500);
  assert.equal(afterHistoricalSpend.remainingTodayMinor, 1_000);

  data.expenses = data.expenses.filter((item) => item.id !== "historical");
  const afterDelete = calculateBudget(data, period, "2026-01-04");
  assert.equal(afterDelete.dailyBaseAllowanceMinor, 1_000);
  assert.equal(afterDelete.previousCarryoverMinor, 3_000);
  assert.equal(afterDelete.remainingTodayMinor, 1_500);
});

test("budget handles deficit, salary day, and date boundaries", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 500 });
  data.expenses.push(tx({ amountMinor: 1_000 }));
  const negative = calculateBudget(data, period, "2026-01-30");
  assert.equal(negative.remainingMinor, -500);
  assert.equal(negative.remainingTodayMinor, -500);
  assert.ok(negative.projectedRemainingMinor < 0);
  const salaryDay = calculateBudget(data, period, "2026-01-31");
  assert.equal(salaryDay.daysUntilSalary, 0);
  assert.equal(salaryDay.dailyBaseAllowanceMinor, 16);
  assert.equal(salaryDay.confirmedExpensesMinor, 1_000);
  assert.equal(currentSalaryPeriod({ ...data, salaryPeriods: [period] }, "2026-01-31"), undefined);
  assert.equal(
    currentSalaryPeriod({ ...data, salaryPeriods: [period] }, "2026-01-30")?.id,
    period.id,
  );
});

test("account balance applies confirmed own-account flows and skips pending transactions", () => {
  const checking: AccountRecord = {
    id: "checking",
    name: "Checking",
    type: "CHECKING",
    currency: "AMD",
    openingBalanceMinor: 20_000,
  };
  const cash: AccountRecord = {
    id: "cash",
    name: "Cash",
    type: "CASH",
    currency: "AMD",
    openingBalanceMinor: 1_000,
  };
  const data = emptyFinanceData();
  data.accounts.push(checking, cash);
  data.expenses.push(
    tx({ id: "purchase", accountId: checking.id, amountMinor: 2_000 }),
    tx({ id: "refund", accountId: checking.id, amountMinor: 500, type: "REFUND" }),
    tx({
      id: "transfer",
      accountId: checking.id,
      destinationAccountId: cash.id,
      amountMinor: 1_500,
      type: "TRANSFER",
    }),
    tx({
      id: "pending",
      accountId: checking.id,
      amountMinor: 9_000,
      status: "PENDING",
      reviewStatus: "PENDING_REVIEW",
    }),
  );
  assert.equal(calculateAccountBalance(data, checking.id), 17_000);
  assert.equal(calculateAccountBalance(data, cash.id), 2_500);
});

test("memory cache starts empty, notifies subscribers, and clears its whole snapshot", () => {
  const provider = new MemoryStorageProvider();
  let notified = 0;
  const unsubscribe = provider.subscribe(() => notified++);
  assert.deepEqual(provider.getSnapshot(), emptyFinanceData());
  provider.addSalaryPeriod(period);
  provider.addIncome(receivedIncome);
  provider.addExpense(tx({ id: "owned" }));
  provider.addAccount({
    id: "account",
    name: "Cash",
    type: "CASH",
    currency: "AMD",
    openingBalanceMinor: 0,
  });
  assert.equal(notified, 4);
  assert.equal(provider.getSnapshot().income.length, 1);
  provider.clearAllData();
  assert.deepEqual(provider.getSnapshot(), emptyFinanceData());
  assert.equal(provider.capabilities.persistent, false);
  unsubscribe();
});

test("memory provider rejects invalid money, duplicate IDs, and deleting referenced accounts", () => {
  const provider = new MemoryStorageProvider();
  provider.addSalaryPeriod(period);
  assert.throws(
    () => provider.addIncome({ ...receivedIncome, amountMinor: 1.5 }),
    /positive safe integer/,
  );
  provider.addIncome(receivedIncome);
  assert.throws(() => provider.addIncome(receivedIncome), /already exists/);
  provider.addAccount({
    id: "a",
    name: "Checking",
    type: "CHECKING",
    currency: "AMD",
    openingBalanceMinor: 0,
  });
  provider.addExpense(tx({ id: "uses-account", accountId: "a" }));
  assert.throws(() => provider.deleteAccount("a"), /used by a record/);
});

test("storage manager keeps local-only active and refuses unavailable modes without migrating data", () => {
  const manager = new StorageManager(new MemoryStorageProvider());
  manager.activeProvider.addSalaryPeriod(period);
  manager.activeProvider.addIncome(receivedIncome);
  assert.throws(() => manager.select("PRIVATE_CLOUD"), /planned and cannot be selected/);
  assert.throws(() => manager.select("CUSTOM_DATABASE"), /planned and cannot be selected/);
  assert.equal(manager.mode, "LOCAL_ONLY");
  assert.equal(manager.activeProvider.getIncome().length, 1);
});

test("IndexedDB provider refuses to pretend data is durable when the browser API is unavailable", async () => {
  const provider = new IndexedDbStorageProvider();
  assert.equal(provider.capabilities.persistent, true);
  await assert.rejects(provider.initialize(), /IndexedDB is unavailable/);
});

test("CSV preview is in-memory, idempotent, and creates review candidates only", () => {
  const text =
    'date,description,amount,currency,category,account\n2026-01-03,"Cafe, lunch",-12.34,USD,Food,Cash\n2026-01-04,Salary,500,AMD,Income,Checking\n';
  const first = previewCsvImport(text, []);
  assert.equal(first.records.length, 2);
  assert.equal(first.records[0].status, "PENDING");
  assert.equal(first.records[0].reviewStatus, "PENDING_REVIEW");
  assert.equal(first.records[0].amountMinor, 1_234);
  assert.equal(first.records[1].type, "INCOME");
  const second = previewCsvImport(text, first.records);
  assert.equal(second.records.length, 0);
  assert.equal(second.issues.length, 0);
});

test("versioned export previews validate records and report duplicates without changing storage", () => {
  const data = emptyFinanceData();
  data.income.push(receivedIncome);
  data.salaryPeriods.push(period);
  const envelope = createExportEnvelope(data, "2026-01-20T10:00:00.000Z");
  assert.equal(envelope.format, "finora-export");
  assert.equal(envelope.version, 1);
  const preview = previewImport(envelope, data);
  assert.equal(preview.records.income.length, 0);
  assert.deepEqual(preview.duplicates, ["income:income-1", "salaryPeriods:period-1"]);
  assert.deepEqual(data.income, [receivedIncome]);
  assert.match(
    previewImport({ format: "other", version: 99 }, emptyFinanceData()).errors[0],
    /malformed/,
  );
});

test("Android candidate inbox only accepts allowlisted packages and never stores raw payload text", () => {
  const inbox = new NotificationCandidateInbox();
  const parser: AndroidNotificationParser = {
    parse: (payload) => ({
      id: "candidate-1",
      packageName: payload.packageName,
      description: payload.title,
      amountMinor: 1_500,
      currency: "AMD",
      occurredAt: payload.receivedAt,
      reviewStatus: "PENDING_REVIEW",
    }),
  };
  inbox.receive(
    {
      packageName: "bank.app",
      title: "Card payment",
      text: "OTP 123456 amount 15",
      receivedAt: "2026-01-10T12:00:00",
    },
    new Set(["wallet.app"]),
    parser,
  );
  assert.equal(inbox.list().length, 0);
  inbox.receive(
    {
      packageName: "wallet.app",
      title: "Card payment",
      text: "OTP 123456 amount 15",
      receivedAt: "2026-01-10T12:00:00",
    },
    new Set(["wallet.app"]),
    parser,
  );
  assert.equal(inbox.list().length, 1);
  assert.equal("text" in inbox.list()[0], false);
  inbox.clear();
  assert.equal(inbox.list().length, 0);
});

test("rendered experience has no seeded identities, financial examples, or external network calls", () => {
  const page = readFileSync(
    resolve(process.cwd(), "src/fsd/pages/finance/ui/finance-workspace.tsx"),
    "utf8",
  );
  const source = [
    "src/fsd/pages/finance/ui/finance-workspace.tsx",
    "src/app/layout.tsx",
    "src/features/finance-session/model/finance-context.tsx",
    "src/features/integrations/android-notifications.ts",
    "src/entities/finance/models.ts",
    "src/entities/finance/validation.ts",
    "src/entities/finance/calculations/budget.ts",
    "src/entities/finance/calculations/money.ts",
    "src/entities/finance/csv-import.ts",
    "src/entities/finance/storage/storage-manager.ts",
    "src/entities/finance/storage/providers/memory-storage.provider.ts",
    "src/entities/finance/storage/providers/indexeddb-storage.provider.ts",
  ]
    .flatMap((path) => {
      const fullPath = resolve(process.cwd(), path);
      try {
        return [readFileSync(fullPath, "utf8")];
      } catch {
        return [];
      }
    })
    .join("\n");
  assert.match(page, /No income entered yet/);
  assert.match(page, /No expenses recorded/);
  assert.match(page, /No connected notification sources/);
  for (const forbidden of [
    "localStorage",
    "sessionStorage",
    "document.cookie",
    "fetch(",
    "XMLHttpRequest",
    "sendBeacon",
    "Math.random",
    "console.log",
  ])
    assert.equal(
      source.includes(forbidden),
      false,
      `${forbidden} must not be used by the local finance client`,
    );
  assert.match(source, /indexedDB\.open\(DATABASE_NAME, DATABASE_VERSION\)/);
  assert.match(source, /writeSnapshot\(db, snapshot\)/);
  for (const fake of [
    "Alex Kim",
    "Northstar Studio",
    "Pest coffee",
    "Yerevan City",
    "1450000",
    "initialTx",
    "initialIncome",
  ])
    assert.equal(
      source.includes(fake),
      false,
      `${fake} should not appear as app-provided finance data`,
    );
});
