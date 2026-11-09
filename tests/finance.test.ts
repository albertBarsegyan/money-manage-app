import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import {
  calculateAccountBalance,
  calculateBudget,
  calculateDailyAllowance,
  currentSalaryPeriod,
  dayDifference,
} from "../src/entities/finance/calculations/budget";
import { formatMoney, parseMoney } from "../src/entities/finance/calculations/money";
import { previewCsvImport } from "../src/entities/finance/csv-import";
import {
  countFinanceRecords,
  createExportEnvelope,
  parseExportText,
  previewImport,
  previewReplaceImport,
  serializeExport,
} from "../src/entities/finance/export-format";
import {
  NotificationCandidateInbox,
  type AndroidNotificationParser,
} from "../src/features/integrations/android-notifications";
import { resolveFinoraDeepLink } from "../src/lib/native/deep-links";
import {
  emptyFinanceData,
  type AccountRecord,
  type ExpenseRecord,
  type IncomeRecord,
  type SalaryPeriod,
} from "../src/entities/finance/models";
import { validateMonitoredCard } from "../src/entities/finance/validation";
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

test("daily allowance divides the actual remaining pool once and never adds historical carryover twice", () => {
  const result = calculateDailyAllowance(13_000_000, 28, 0);
  assert.equal(result.dailyAllowanceMinor, 464_286);
  assert.equal(result.availableTodayMinor, 464_286);
  assert.match(
    formatMoney({ amountMinor: result.dailyAllowanceMinor, currency: "AMD" }, "en-US"),
    /4,642\.86/,
  );
  assert.notEqual(result.dailyAllowanceMinor, 392_717);
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
    tx({ id: "confirmed", amountMinor: 3_000, budgetMode: "GLOBAL" }),
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
  assert.ok(result.availableTodayMinor <= result.remainingMinor);
  assert.equal(result.spentTodayMinor, 0);
  assert.deepEqual(result.categoryTotals, [{ category: "Food", amountMinor: 3_000 }]);
});

test("spending the full allowance leaves no amount available today", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({
      id: "exact",
      amountMinor: 1_000,
      occurredAt: "2026-01-01T12:00",
      budgetMode: "DAILY",
    }),
  );
  const day = calculateBudget(data, period, "2026-01-01");
  assert.equal(day.dailyAllowanceMinor, 1_000);
  assert.equal(day.availableTodayMinor, 0);
  assert.equal(day.spentTodayMinor, 1_000);
  const next = calculateBudget(data, period, "2026-01-02");
  assert.equal(next.availableTodayMinor, 1_000);
});

test("unused funds remain in the period pool and are redistributed over remaining days", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  const day = calculateBudget(data, period, "2026-01-01");
  assert.equal(day.availableTodayMinor, 1_000);
  const later = calculateBudget(data, period, "2026-01-04");
  assert.equal(later.dailyAllowanceMinor, 1_111);
  assert.equal(later.availableTodayMinor, 1_111);
});

test("today's confirmed daily spending is subtracted once from the allowance", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({ id: "today", amountMinor: 2_500, occurredAt: "2026-01-04T12:00", budgetMode: "DAILY" }),
  );

  const today = calculateBudget(data, period, "2026-01-04");
  assert.equal(today.dailyAllowanceMinor, 1_111);
  assert.equal(today.availableTodayMinor, -1_389);
  assert.equal(today.spentTodayMinor, 2_500);

  const tomorrow = calculateBudget(data, period, "2026-01-05");
  assert.equal(tomorrow.availableTodayMinor, 1_058);
  assert.deepEqual(today, calculateBudget(data, period, "2026-01-04"));
});

test("overspending is included in the actual period remainder for future allowances", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 120_000 });
  data.expenses.push(
    tx({ id: "mon", amountMinor: 5_000, occurredAt: "2026-01-01T12:00", budgetMode: "DAILY" }),
  );
  const monday = calculateBudget(data, period, "2026-01-01");
  assert.equal(monday.dailyAllowanceMinor, 4_000);
  assert.equal(monday.availableTodayMinor, -1_000);

  data.expenses.push(
    tx({ id: "tue", amountMinor: 2_000, occurredAt: "2026-01-02T12:00", budgetMode: "DAILY" }),
  );
  const tuesday = calculateBudget(data, period, "2026-01-02");
  assert.equal(tuesday.availableTodayMinor, 1_966);

  const wednesday = calculateBudget(data, period, "2026-01-03");
  assert.equal(wednesday.availableTodayMinor, 4_036);
});

test("multiple under-spent days remain available in the actual period pool", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 120_000 });
  data.expenses.push(
    tx({ id: "mon", amountMinor: 1_000, occurredAt: "2026-01-01T12:00", budgetMode: "DAILY" }),
    tx({ id: "tue", amountMinor: 2_000, occurredAt: "2026-01-02T12:00", budgetMode: "DAILY" }),
  );
  assert.equal(calculateBudget(data, period, "2026-01-01").availableTodayMinor, 3_000);
  assert.equal(calculateBudget(data, period, "2026-01-02").availableTodayMinor, 2_103);
  assert.equal(calculateBudget(data, period, "2026-01-03").availableTodayMinor, 4_179);
});

test("historical daily expense edits and deletes recalculate the period pool without persisted carryover", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({
      id: "historical",
      amountMinor: 500,
      occurredAt: "2026-01-02T12:00",
      budgetMode: "DAILY",
    }),
    tx({ id: "today", amountMinor: 2_500, occurredAt: "2026-01-04T12:00", budgetMode: "DAILY" }),
  );

  const afterHistoricalSpend = calculateBudget(data, period, "2026-01-04");
  assert.equal(afterHistoricalSpend.dailyAllowanceMinor, 1_093);
  assert.equal(afterHistoricalSpend.availableTodayMinor, -1_407);
  assert.deepEqual(afterHistoricalSpend, calculateBudget(data, period, "2026-01-04"));

  data.expenses = data.expenses.filter((item) => item.id !== "historical");
  const afterDelete = calculateBudget(data, period, "2026-01-04");
  assert.equal(afterDelete.dailyAllowanceMinor, 1_111);
  assert.equal(afterDelete.availableTodayMinor, -1_389);

  const edited = data.expenses.find((item) => item.id === "today")!;
  edited.amountMinor = 1_000;
  const afterEdit = calculateBudget(data, period, "2026-01-04");
  assert.equal(afterEdit.spentTodayMinor, 1_000);
  assert.equal(afterEdit.availableTodayMinor, 111);
});

test("global expenses reduce the period budget and recalculate future daily allowances", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  const before = calculateBudget(data, period, "2026-01-08");
  assert.equal(before.dailyAllowanceMinor, 1_304);
  assert.equal(before.availableTodayMinor, 1_304);

  data.expenses.push(
    tx({ id: "rent", amountMinor: 6_000, occurredAt: "2026-01-08T09:00", budgetMode: "GLOBAL" }),
  );
  const after = calculateBudget(data, period, "2026-01-08");
  assert.equal(after.remainingMinor, 24_000);
  assert.equal(after.spentTodayMinor, 0);
  assert.equal(after.dailyAllowanceMinor, 1_043);
  assert.ok(after.availableTodayMinor <= after.remainingMinor);
  assert.ok(after.availableTodayMinor < before.availableTodayMinor);
});

test("daily and global expenses on the same day each affect the budget exactly once", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({ id: "daily", amountMinor: 1_000, occurredAt: "2026-01-08T12:00", budgetMode: "DAILY" }),
    tx({ id: "global", amountMinor: 3_000, occurredAt: "2026-01-08T13:00", budgetMode: "GLOBAL" }),
  );
  const result = calculateBudget(data, period, "2026-01-08");
  assert.equal(result.remainingMinor, 26_000);
  assert.equal(result.spentTodayMinor, 1_000);
  assert.equal(result.dailyAllowanceMinor, 1_174);
  assert.equal(result.availableTodayMinor, 174);
});

test("refunds restore period funds without counting as daily spending", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({ id: "bill", amountMinor: 3_000, occurredAt: "2026-01-05T12:00", budgetMode: "GLOBAL" }),
    tx({ id: "refund", amountMinor: 1_000, occurredAt: "2026-01-06T12:00", type: "REFUND" }),
  );
  const result = calculateBudget(data, period, "2026-01-06");
  assert.equal(result.confirmedExpensesMinor, 3_000);
  assert.equal(result.refundsMinor, 1_000);
  assert.equal(result.remainingMinor, 28_000);
  assert.equal(result.spentTodayMinor, 0);
});

test("changing the salary-period budget recalculates daily availability", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  const low = calculateBudget(data, period, "2026-01-01");
  assert.equal(low.availableTodayMinor, 1_000);
  data.income[0] = { ...receivedIncome, amountMinor: 60_000 };
  const high = calculateBudget(data, period, "2026-01-01");
  assert.equal(high.availableTodayMinor, 2_000);
});

test("crossing into a new calendar day recalculates from the unspent period pool", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  data.expenses.push(
    tx({ id: "partial", amountMinor: 400, occurredAt: "2026-01-03T18:00", budgetMode: "DAILY" }),
  );
  const evening = calculateBudget(data, period, "2026-01-03");
  const morning = calculateBudget(data, period, "2026-01-04");
  assert.equal(morning.availableTodayMinor, morning.dailyAllowanceMinor);
  assert.ok(morning.dailyAllowanceMinor > evening.availableTodayMinor);
});

test("crossing into a new salary period isolates budgets", () => {
  const nextPeriod: SalaryPeriod = {
    ...period,
    id: "period-2",
    startsOn: "2026-01-31",
    nextSalaryOn: "2026-02-28",
  };
  const data = emptyFinanceData();
  data.salaryPeriods.push(period, nextPeriod);
  data.income.push(
    { ...receivedIncome, amountMinor: 30_000 },
    {
      ...receivedIncome,
      id: "income-2",
      amountMinor: 40_000,
      receivedOn: "2026-01-31",
      salaryPeriodId: nextPeriod.id,
    },
  );
  data.expenses.push(
    tx({ id: "old", amountMinor: 5_000, occurredAt: "2026-01-10T12:00", budgetMode: "DAILY" }),
  );
  const previous = calculateBudget(data, period, "2026-01-30");
  const next = calculateBudget(data, nextPeriod, "2026-01-31");
  assert.ok(previous.confirmedExpensesMinor > 0);
  assert.equal(next.confirmedExpensesMinor, 0);
  assert.equal(next.availableTodayMinor, Math.round(40_000 / 28));
  assert.equal(currentSalaryPeriod(data, "2026-01-31")?.id, nextPeriod.id);
});

test("available daily spending never exceeds remaining period funds", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 10_000 });
  for (let day = 1; day <= 20; day += 1) {
    const date = `2026-01-${String(day).padStart(2, "0")}`;
    const summary = calculateBudget(data, period, date);
    if (summary.remainingMinor >= 0) {
      assert.ok(summary.availableTodayMinor <= summary.remainingMinor);
    }
  }
  data.expenses.push(
    tx({ id: "big", amountMinor: 9_500, occurredAt: "2026-01-05T12:00", budgetMode: "GLOBAL" }),
  );
  const tight = calculateBudget(data, period, "2026-01-10");
  assert.ok(tight.availableTodayMinor <= tight.remainingMinor);
});

test("budget handles deficit, salary day, and date boundaries", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 500 });
  data.expenses.push(tx({ amountMinor: 1_000, budgetMode: "GLOBAL" }));
  const negative = calculateBudget(data, period, "2026-01-30");
  assert.equal(negative.remainingMinor, -500);
  assert.equal(negative.availableTodayMinor, -500);
  assert.ok(negative.projectedRemainingMinor < 0);
  const salaryDay = calculateBudget(data, period, "2026-01-31");
  assert.equal(salaryDay.daysUntilSalary, 0);
  assert.equal(salaryDay.confirmedExpensesMinor, 1_000);
  assert.equal(salaryDay.remainingMinor, -500);
  assert.equal(currentSalaryPeriod({ ...data, salaryPeriods: [period] }, "2026-01-31"), undefined);
  assert.equal(
    currentSalaryPeriod({ ...data, salaryPeriods: [period] }, "2026-01-30")?.id,
    period.id,
  );
});

test("daily allowance is zero before a period and on or after its exclusive end date", () => {
  const data = emptyFinanceData();
  data.income.push({ ...receivedIncome, amountMinor: 30_000 });
  const before = calculateBudget(data, period, "2025-12-31");
  const endsToday = calculateBudget(data, period, "2026-01-31");
  const expired = calculateBudget(data, period, "2026-02-01");
  assert.equal(before.dailyAllowanceMinor, 0);
  assert.equal(endsToday.dailyAllowanceMinor, 0);
  assert.equal(expired.dailyAllowanceMinor, 0);
});

test("date-only day counts include today and handle month, year, and leap-day boundaries", () => {
  assert.equal(dayDifference("2026-12-07", "2027-01-04"), 28);
  assert.equal(dayDifference("2024-02-28", "2024-03-01"), 2);
  assert.equal(dayDifference("2026-01-31", "2026-02-01"), 1);
  assert.equal(dayDifference("2026-01-01", "2026-01-01"), 0);
});

test("daily allowance handles zero and negative remaining funds without floating point money", () => {
  assert.deepEqual(calculateDailyAllowance(0, 28, 0), {
    dailyAllowanceMinor: 0,
    availableTodayMinor: 0,
  });
  assert.deepEqual(calculateDailyAllowance(-1_001, 10, 99), {
    dailyAllowanceMinor: -100,
    availableTodayMinor: -199,
  });
  assert.deepEqual(calculateDailyAllowance(10_000, 0, 0), {
    dailyAllowanceMinor: 0,
    availableTodayMinor: 0,
  });
});

test("same-provider expense operations stay in the snapshot and recalculate after reload-style reads", () => {
  const provider = new MemoryStorageProvider();
  provider.addSalaryPeriod(period);
  provider.addIncome({ ...receivedIncome, amountMinor: 30_000 });
  provider.addExpense(tx({ id: "first", amountMinor: 1_000, budgetMode: "DAILY" }));
  provider.addExpense(tx({ id: "second", amountMinor: 2_000, budgetMode: "GLOBAL" }));
  const afterAdd = calculateBudget(provider.getSnapshot(), period, "2026-01-08");
  assert.equal(afterAdd.remainingMinor, 27_000);

  provider.updateExpense(tx({ id: "second", amountMinor: 3_000, budgetMode: "GLOBAL" }));
  assert.equal(
    calculateBudget(provider.getSnapshot(), period, "2026-01-08").remainingMinor,
    26_000,
  );
  provider.deleteExpense("first");
  const afterDelete = calculateBudget(provider.getSnapshot(), period, "2026-01-08");
  assert.equal(afterDelete.remainingMinor, 27_000);
  assert.equal(afterDelete.spentTodayMinor, 0);
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

test("compact JSON export round-trips through replace import and updates the active provider", () => {
  const source = emptyFinanceData();
  source.salaryPeriods.push(period);
  source.income.push(receivedIncome);
  source.accounts.push({
    id: "cash",
    name: "Cash",
    type: "CASH",
    currency: "AMD",
    openingBalanceMinor: 500,
  });
  source.expenses.push(
    tx({
      id: "expense-1",
      accountId: "cash",
      salaryPeriodId: period.id,
      amountMinor: 250,
    }),
  );
  source.notificationReader = { enabled: true, selectedPackages: ["bank.app"] };
  const compact = serializeExport(source, "2026-01-20T10:00:00.000Z");
  assert.equal(compact.includes("\n"), false);
  assert.equal(JSON.parse(compact).format, "finora-export");
  const preview = parseExportText(compact);
  assert.deepEqual(preview.errors, []);
  assert.equal(countFinanceRecords(preview.records).total, 4);
  const provider = new MemoryStorageProvider();
  provider.addAccount({
    id: "old",
    name: "Old",
    type: "OTHER",
    currency: "USD",
    openingBalanceMinor: 1,
  });
  assert.equal(provider.capabilities.importExport, true);
  provider.replaceAllData(preview.records);
  assert.deepEqual(provider.getSnapshot().income, source.income);
  assert.deepEqual(provider.getSnapshot().expenses, source.expenses);
  assert.deepEqual(provider.getSnapshot().accounts, source.accounts);
  assert.deepEqual(provider.getSnapshot().salaryPeriods, source.salaryPeriods);
  assert.deepEqual(provider.getSnapshot().notificationReader, source.notificationReader);
  assert.match(parseExportText("{not-json").errors[0], /valid JSON/);
  assert.match(previewReplaceImport({ format: "other", version: 1 }).errors[0], /malformed/);
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
  inbox.clear();
  assert.equal(inbox.list().length, 0);
});

test("monitored cards accept only last-four metadata and link to a same-currency account", () => {
  const provider = new MemoryStorageProvider();
  provider.addAccount({
    id: "bank-account",
    name: "Everyday account",
    type: "CHECKING",
    currency: "AMD",
    openingBalanceMinor: 0,
  });
  const card = {
    id: "debit-card",
    name: "Everyday debit",
    bankName: "Local Bank",
    type: "DEBIT" as const,
    lastFour: "1234",
    currency: "AMD" as const,
    accountId: "bank-account",
    monitoringEnabled: true,
  };
  provider.addMonitoredCard(card);
  assert.equal(provider.getMonitoredCards()[0].id, card.id);
  provider.updateMonitoredCard({ ...card, monitoringEnabled: false });
  assert.equal(provider.getMonitoredCards()[0].monitoringEnabled, false);
  assert.throws(
    () => provider.updateMonitoredCard({ ...card, lastFour: "1234567890123456" }),
    /last four digits/,
  );
  assert.throws(() => provider.updateMonitoredCard({ ...card, currency: "USD" }), /same currency/);
  provider.deleteMonitoredCard(card.id);
  assert.equal(provider.getMonitoredCards().length, 0);
  assert.deepEqual(validateMonitoredCard({ ...card, lastFour: undefined }), []);
});

test("Finora deep links resolve only registered internal routes", () => {
  assert.equal(resolveFinoraDeepLink("com.finora.app://transactions"), "/transactions");
  assert.equal(resolveFinoraDeepLink("com.finora.app:///settings"), "/settings");
  assert.equal(resolveFinoraDeepLink("com.finora.app://"), "/");
  assert.equal(resolveFinoraDeepLink("https://finora.example/transactions"), null);
  assert.equal(resolveFinoraDeepLink("com.finora.app://unknown"), null);
  assert.equal(resolveFinoraDeepLink("com.finora.app://transactions?q=secret"), null);
  assert.equal(resolveFinoraDeepLink("com.finora.app://user@transactions"), null);
});

test("rendered experience has no seeded identities, financial examples, or external network calls", () => {
  const page = [
    "src/fsd/pages/finance/ui/finance-workspace.tsx",
    "src/fsd/pages/finance/ui/overview-page.tsx",
    "src/fsd/pages/finance/ui/income-page.tsx",
    "src/fsd/pages/finance/ui/transactions-page.tsx",
    "src/fsd/pages/finance/ui/integrations-page.tsx",
  ]
    .map((path) => readFileSync(resolve(process.cwd(), path), "utf8"))
    .join("\n");
  const source = [
    "src/fsd/pages/finance/ui/finance-workspace.tsx",
    "src/fsd/pages/finance/ui/overview-page.tsx",
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
