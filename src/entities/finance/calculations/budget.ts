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
  let incomeMinor = 0;
  let expenseMinor = 0;
  let refundMinor = 0;
  const categories = new Map<string, number>();
  const activity = new Map<string, number>();
  const spendingByDay = new Map<string, number>();
  for (const item of incomes) incomeMinor = addMinorUnits(incomeMinor, item.amountMinor);
  for (const item of transactionIncome) incomeMinor = addMinorUnits(incomeMinor, item.amountMinor);
  for (const item of entries) {
    if (item.type === "TRANSFER") continue;
    if (item.type === "INCOME") {
      activity.set(
        item.occurredAt.slice(0, 10),
        addMinorUnits(activity.get(item.occurredAt.slice(0, 10)) || 0, item.amountMinor),
      );
      continue;
    }
    if (item.type === "REFUND") {
      refundMinor = addMinorUnits(refundMinor, item.amountMinor);
      const date = item.occurredAt.slice(0, 10);
      spendingByDay.set(date, addMinorUnits(spendingByDay.get(date) || 0, -item.amountMinor));
      activity.set(date, addMinorUnits(activity.get(date) || 0, -item.amountMinor));
      continue;
    }
    expenseMinor = addMinorUnits(expenseMinor, item.amountMinor);
    const date = item.occurredAt.slice(0, 10);
    spendingByDay.set(date, addMinorUnits(spendingByDay.get(date) || 0, item.amountMinor));
    categories.set(
      item.category,
      addMinorUnits(categories.get(item.category) || 0, item.amountMinor),
    );
    activity.set(date, addMinorUnits(activity.get(date) || 0, item.amountMinor));
  }
  const remainingMinor = addMinorUnits(addMinorUnits(incomeMinor, -expenseMinor), refundMinor);
  const daysUntilSalary = dayDifference(today, period.nextSalaryOn);
  const daysInPeriod = Math.max(1, dayDifference(period.startsOn, period.nextSalaryOn));
  const elapsedDays = Math.min(daysInPeriod, Math.max(0, dayDifference(period.startsOn, today)));
  const periodProgress = Math.min(100, Math.floor((elapsedDays / daysInPeriod) * 100));

  // Allocate confirmed period income evenly across its days, distributing
  // indivisible minor units from the start. The cumulative form of the daily
  // reconciliation recurrence avoids storing derived day records while still
  // replaying the effect of all prior confirmed activity deterministically.
  const dailyIncomeBase = Math.trunc(incomeMinor / daysInPeriod);
  const dailyIncomeRemainder = incomeMinor % daysInPeriod;
  const currentDayIndex = Math.min(
    daysInPeriod - 1,
    Math.max(0, dayDifference(period.startsOn, today)),
  );
  const allocatedBeforeToday = addMinorUnits(
    multiplyMinorUnits(dailyIncomeBase, currentDayIndex),
    Math.min(currentDayIndex, dailyIncomeRemainder),
  );
  let spendingBeforeTodayMinor = 0;
  for (const [date, amountMinor] of spendingByDay) {
    if (date < today)
      spendingBeforeTodayMinor = addMinorUnits(spendingBeforeTodayMinor, amountMinor);
  }
  const dailyBaseAllowanceMinor = addMinorUnits(
    dailyIncomeBase,
    currentDayIndex < dailyIncomeRemainder ? 1 : 0,
  );
  const previousCarryoverMinor = addMinorUnits(allocatedBeforeToday, -spendingBeforeTodayMinor);
  const availableTodayMinor = addMinorUnits(dailyBaseAllowanceMinor, previousCarryoverMinor);
  const spentTodayMinor = spendingByDay.get(today) || 0;
  const remainingTodayMinor = addMinorUnits(availableTodayMinor, -spentTodayMinor);

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
    dailyBaseAllowanceMinor,
    previousCarryoverMinor,
    availableTodayMinor,
    spentTodayMinor,
    remainingTodayMinor,
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
