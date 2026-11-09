import type { ExpenseRecord, FinanceData, IncomeRecord, SalaryPeriod } from "../models";
import { addMinorUnits } from "./money";

export interface BudgetSummary {
  currency: SalaryPeriod["currency"];
  confirmedIncomeMinor: number;
  confirmedExpensesMinor: number;
  refundsMinor: number;
  /** Confirmed period income + refunds − confirmed period expenses. */
  remainingMinor: number;
  daysUntilSalary: number;
  dailyAllowanceMinor: number;
  availableTodayMinor: number;
  spentTodayMinor: number;
  periodProgress: number;
  /**
   * Expected balance at the next payday from confirmed activity only.
   * Equals remainingMinor while the app has no future-transaction forecast.
   */
  projectedRemainingMinor: number;
  categoryTotals: Array<{ category: string; amountMinor: number }>;
  activityByDay: Array<{ date: string; amountMinor: number }>;
}

/**
 * Deterministic salary-period budget. Unspent money stays in the period pool,
 * so dividing that pool by remaining eligible days carries unused funds forward
 * automatically without adding historical carryover a second time.
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
    }
  }

  const remainingMinor = addMinorUnits(addMinorUnits(incomeMinor, -expenseMinor), refundMinor);
  const daysUntilSalary = dayDifference(today, period.nextSalaryOn);
  const daysInPeriod = Math.max(1, dayDifference(period.startsOn, period.nextSalaryOn));
  const elapsedDays = Math.min(daysInPeriod, Math.max(0, dayDifference(period.startsOn, today)));
  const periodProgress = Math.min(100, Math.floor((elapsedDays / daysInPeriod) * 100));

  const spentTodayMinor = dailySpendByDay.get(today) || 0;
  // remainingMinor includes today's daily expenses. Add those back to get the
  // pool available at the start of today, then subtract them from today's
  // allowance once. Global expenses remain deducted immediately.
  const todayPoolMinor = addMinorUnits(remainingMinor, spentTodayMinor);
  const isActivePeriodDay = period.startsOn <= today && today < period.nextSalaryOn;
  const daily = calculateDailyAllowance(
    todayPoolMinor,
    isActivePeriodDay ? daysUntilSalary : 0,
    spentTodayMinor,
  );
  // The app has no reliable forecast model for future spend or expected income
  // (EXPECTED income is tracked separately and excluded until RECEIVED). Do not
  // invent future transactions by extrapolating historical average outflow.
  // Expected balance at payday is therefore the confirmed period remainder.
  const projectedRemainingMinor = remainingMinor;

  return {
    currency: period.currency,
    confirmedIncomeMinor: incomeMinor,
    confirmedExpensesMinor: expenseMinor,
    refundsMinor: refundMinor,
    remainingMinor,
    daysUntilSalary,
    dailyAllowanceMinor: daily.dailyAllowanceMinor,
    availableTodayMinor: daily.availableTodayMinor,
    spentTodayMinor,
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

interface DailyAllowanceResult {
  dailyAllowanceMinor: number;
  availableTodayMinor: number;
}

/**
 * Divide the actual remaining period pool across its remaining calendar days.
 * Unused historical allowances are already in the pool and must not be added
 * again as carryover. Round to the nearest minor unit for display precision;
 * future calculations always use the actual remaining pool, not this rounded
 * display allocation.
 */
export function calculateDailyAllowance(
  remainingPoolMinor: number,
  remainingDays: number,
  spentTodayMinor: number,
): DailyAllowanceResult {
  const dailyAllowanceMinor =
    remainingDays > 0 ? Math.round(remainingPoolMinor / remainingDays) : 0;
  return {
    dailyAllowanceMinor,
    availableTodayMinor: addMinorUnits(dailyAllowanceMinor, -spentTodayMinor),
  };
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

/** Date-only UTC arithmetic avoids daylight-saving and timezone-boundary errors. */
export function dayDifference(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.ceil((end - start) / 86_400_000));
}
