import type { ExpenseRecord, FinanceData, IncomeRecord, SalaryPeriod } from "../models";
import { addMinorUnits } from "./money";

export interface BudgetSummary {
  currency: SalaryPeriod["currency"];
  confirmedIncomeMinor: number;
  confirmedExpensesMinor: number;
  refundsMinor: number;
  remainingMinor: number;
  daysUntilSalary: number;
  dailyBaseAllowanceMinor: number;
  previousCarryoverMinor: number;
  availableTodayMinor: number;
  spentTodayMinor: number;
  remainingTodayMinor: number;
  periodProgress: number;
  projectedRemainingMinor: number;
  categoryTotals: Array<{ category: string; amountMinor: number }>;
  activityByDay: Array<{ date: string; amountMinor: number }>;
}

/**
 * Deterministic salary-period budget with daily allowance carryover.
 *
 * Daily expenses consume today's available amount (base + prior carryover).
 * Unused or overspent daily amounts carry into the next calendar day.
 * Global expenses, refunds, and transaction income change the remaining pool
 * and immediately recalculate the base daily allowance for remaining days.
 *
 * Carryover is always replayed from confirmed transactions — never stored —
 * so reloads cannot duplicate savings.
 */
export function calculateBudget(
  data: FinanceData,
  period: SalaryPeriod,
  today: string,
): BudgetSummary {
  const incomes = data.income.filter((item) => incomeApplies(item, period, today));
  const transactionIncome = data.expenses.filter(
    (item) => item.type === "INCOME" && expenseApplies(item, period, today),
  );
  const entries = data.expenses.filter((item) => expenseApplies(item, period, today));
  let receivedSalaryMinor = 0;
  let otherIncomeMinor = 0;
  let expenseMinor = 0;
  let refundMinor = 0;
  const categories = new Map<string, number>();
  const activity = new Map<string, number>();
  const dailySpendByDay = new Map<string, number>();
  const globalAdjustByDay = new Map<string, number>();

  for (const item of incomes) {
    if (item.source === "SALARY")
      receivedSalaryMinor = addMinorUnits(receivedSalaryMinor, item.amountMinor);
    else otherIncomeMinor = addMinorUnits(otherIncomeMinor, item.amountMinor);
  }
  const salaryBudgetMinor = receivedSalaryMinor || period.expectedSalaryMinor || 0;
  let incomeMinor = addMinorUnits(salaryBudgetMinor, otherIncomeMinor);
  for (const item of transactionIncome) {
    incomeMinor = addMinorUnits(incomeMinor, item.amountMinor);
    const date = item.occurredAt.slice(0, 10);
    activity.set(date, addMinorUnits(activity.get(date) || 0, item.amountMinor));
  }

  for (const item of entries) {
    if (item.type === "TRANSFER") continue;
    if (item.type === "INCOME") {
      // Counted in incomeMinor above; do not treat as a daily/global expense.
      continue;
    }
    const date = item.occurredAt.slice(0, 10);
    if (item.type === "REFUND") {
      refundMinor = addMinorUnits(refundMinor, item.amountMinor);
      // Refunds restore period funds and recalculate future daily allowances.
      globalAdjustByDay.set(
        date,
        addMinorUnits(globalAdjustByDay.get(date) || 0, -item.amountMinor),
      );
      activity.set(date, addMinorUnits(activity.get(date) || 0, -item.amountMinor));
      continue;
    }
    expenseMinor = addMinorUnits(expenseMinor, item.amountMinor);
    categories.set(
      item.category,
      addMinorUnits(categories.get(item.category) || 0, item.amountMinor),
    );
    activity.set(date, addMinorUnits(activity.get(date) || 0, item.amountMinor));
    if (isDailyExpense(item)) {
      dailySpendByDay.set(date, addMinorUnits(dailySpendByDay.get(date) || 0, item.amountMinor));
    } else {
      globalAdjustByDay.set(
        date,
        addMinorUnits(globalAdjustByDay.get(date) || 0, item.amountMinor),
      );
    }
  }

  const remainingMinor = addMinorUnits(addMinorUnits(incomeMinor, -expenseMinor), refundMinor);
  const daysUntilSalary = dayDifference(today, period.nextSalaryOn);
  const daysInPeriod = Math.max(1, dayDifference(period.startsOn, period.nextSalaryOn));
  const elapsedDays = Math.min(daysInPeriod, Math.max(0, dayDifference(period.startsOn, today)));
  const periodProgress = Math.min(100, Math.floor((elapsedDays / daysInPeriod) * 100));

  const daily = replayDailyAllowance({
    periodStartsOn: period.startsOn,
    nextSalaryOn: period.nextSalaryOn,
    today,
    openingPoolMinor: incomeMinor,
    dailySpendByDay,
    globalAdjustByDay,
  });

  const spentTodayMinor = dailySpendByDay.get(today) || 0;
  const elapsedOutflow = addMinorUnits(expenseMinor, -refundMinor);
  const dailyOutflow = elapsedDays > 0 ? Math.trunc(elapsedOutflow / elapsedDays) : 0;
  const projectedRemainingMinor = addMinorUnits(
    remainingMinor,
    -multiplyMinorUnits(dailyOutflow, daysUntilSalary),
  );

  return {
    currency: period.currency,
    confirmedIncomeMinor: incomeMinor,
    confirmedExpensesMinor: expenseMinor,
    refundsMinor: refundMinor,
    remainingMinor,
    daysUntilSalary,
    dailyBaseAllowanceMinor: daily.dailyBaseAllowanceMinor,
    previousCarryoverMinor: daily.previousCarryoverMinor,
    availableTodayMinor: daily.availableTodayMinor,
    spentTodayMinor,
    remainingTodayMinor: daily.remainingTodayMinor,
    periodProgress,
    projectedRemainingMinor,
    categoryTotals: [...categories]
      .map(([category, amountMinor]) => ({ category, amountMinor }))
      .sort((a, b) => b.amountMinor - a.amountMinor),
    activityByDay: [...activity]
      .map(([date, amountMinor]) => ({ date, amountMinor }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export function currentSalaryPeriod(data: FinanceData, today: string): SalaryPeriod | undefined {
  return data.salaryPeriods.find(
    (period) => period.startsOn <= today && today < period.nextSalaryOn,
  );
}

export function calculateAccountBalance(data: FinanceData, accountId: string) {
  const account = data.accounts.find((item) => item.id === accountId);
  if (!account) return undefined;
  let balance = account.openingBalanceMinor;
  for (const income of data.income) {
    if (
      income.accountId === accountId &&
      income.status === "RECEIVED" &&
      income.currency === account.currency
    )
      balance = addMinorUnits(balance, income.amountMinor);
  }
  for (const transaction of data.expenses) {
    if (
      transaction.status !== "CONFIRMED" ||
      transaction.reviewStatus !== "CONFIRMED" ||
      transaction.currency !== account.currency
    )
      continue;
    if (transaction.type === "TRANSFER") {
      if (transaction.accountId === accountId)
        balance = addMinorUnits(balance, -transaction.amountMinor);
      if (transaction.destinationAccountId === accountId)
        balance = addMinorUnits(balance, transaction.amountMinor);
    } else if (transaction.accountId === accountId && transaction.type === "EXPENSE")
      balance = addMinorUnits(balance, -transaction.amountMinor);
    else if (
      transaction.accountId === accountId &&
      (transaction.type === "REFUND" || transaction.type === "INCOME")
    )
      balance = addMinorUnits(balance, transaction.amountMinor);
  }
  return balance;
}

interface DailyReplayInput {
  periodStartsOn: string;
  nextSalaryOn: string;
  today: string;
  openingPoolMinor: number;
  dailySpendByDay: Map<string, number>;
  globalAdjustByDay: Map<string, number>;
}

interface DailyReplayResult {
  dailyBaseAllowanceMinor: number;
  previousCarryoverMinor: number;
  availableTodayMinor: number;
  remainingTodayMinor: number;
}

/**
 * Replay each calendar day in the salary period up to today.
 *
 * Base allowance is `floor((pool - carryover) / daysLeft)` so unused daily
 * money is attributed to carryover instead of being redistributed twice.
 * Global adjustments change the pool and force a fresh base for that day.
 */
function replayDailyAllowance(input: DailyReplayInput): DailyReplayResult {
  const lastDay =
    input.today < input.nextSalaryOn ? input.today : addCalendarDays(input.nextSalaryOn, -1);
  if (lastDay < input.periodStartsOn || input.today < input.periodStartsOn) {
    return {
      dailyBaseAllowanceMinor: 0,
      previousCarryoverMinor: 0,
      availableTodayMinor: 0,
      remainingTodayMinor: 0,
    };
  }

  let poolMinor = input.openingPoolMinor;
  let carryoverMinor = 0;
  let baseMinor = 0;
  let previousCarryoverMinor = 0;
  let availableTodayMinor = 0;
  let remainingTodayMinor = 0;
  const targetDay = input.today <= lastDay ? input.today : lastDay;

  for (let day = input.periodStartsOn; day <= targetDay; day = addCalendarDays(day, 1)) {
    const daysLeft = Math.max(1, dayDifference(day, input.nextSalaryOn));
    const globalAdjust = input.globalAdjustByDay.get(day) || 0;
    if (globalAdjust !== 0) poolMinor = addMinorUnits(poolMinor, -globalAdjust);

    // Recalculate every day from (pool - carryover) so global changes and
    // shrinking remaining days stay consistent without double-counting savings.
    baseMinor = allocateBase(poolMinor, carryoverMinor, daysLeft);

    const uncappedAvailable = addMinorUnits(baseMinor, carryoverMinor);
    const availableMinor =
      poolMinor > 0 ? Math.min(uncappedAvailable, poolMinor) : uncappedAvailable;
    const dailySpend = input.dailySpendByDay.get(day) || 0;
    const remainingForDay = addMinorUnits(availableMinor, -dailySpend);

    if (day === targetDay) {
      previousCarryoverMinor = carryoverMinor;
      availableTodayMinor = availableMinor;
      remainingTodayMinor = remainingForDay;
      break;
    }

    carryoverMinor = remainingForDay;
    poolMinor = addMinorUnits(poolMinor, -dailySpend);
  }

  return {
    dailyBaseAllowanceMinor: baseMinor,
    previousCarryoverMinor,
    availableTodayMinor,
    remainingTodayMinor,
  };
}

/** Attribute prior unused allowance to carryover; avoid double-counting in the base. */
function allocateBase(poolMinor: number, carryoverMinor: number, daysLeft: number) {
  const distributable = addMinorUnits(poolMinor, -carryoverMinor);
  if (daysLeft <= 0) return 0;
  return Math.trunc(distributable / daysLeft);
}

function isDailyExpense(item: ExpenseRecord) {
  return item.type === "EXPENSE" && item.budgetMode === "DAILY";
}

function incomeApplies(item: IncomeRecord, period: SalaryPeriod, today: string) {
  const withinDates =
    Boolean(item.receivedOn) &&
    period.startsOn <= item.receivedOn! &&
    item.receivedOn! < period.nextSalaryOn;
  const assigned = item.salaryPeriodId === undefined || item.salaryPeriodId === period.id;
  return (
    item.status === "RECEIVED" &&
    item.currency === period.currency &&
    assigned &&
    withinDates &&
    item.receivedOn! <= today
  );
}

function expenseApplies(item: ExpenseRecord, period: SalaryPeriod, today: string) {
  const date = item.occurredAt.slice(0, 10);
  const assigned = item.salaryPeriodId === undefined || item.salaryPeriodId === period.id;
  return (
    item.status === "CONFIRMED" &&
    item.reviewStatus === "CONFIRMED" &&
    item.currency === period.currency &&
    assigned &&
    period.startsOn <= date &&
    date < period.nextSalaryOn &&
    date <= today
  );
}

function multiplyMinorUnits(amount: number, multiplier: number) {
  const result = amount * multiplier;
  if (!Number.isSafeInteger(result))
    throw new RangeError("Money projection exceeds the safe integer range.");
  return result;
}

/** Date-only UTC arithmetic avoids daylight-saving and timezone-boundary errors. */
export function dayDifference(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}

export function addCalendarDays(date: string, days: number) {
  const value = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(value)) return date;
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
