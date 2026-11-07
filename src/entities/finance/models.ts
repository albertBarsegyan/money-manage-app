export type CurrencyCode = "AMD" | "USD" | "EUR" | "GBP";
export type IncomeSource = "SALARY" | "FREELANCE" | "BUSINESS" | "BONUS" | "OTHER";
export type IncomeStatus = "EXPECTED" | "RECEIVED" | "CANCELLED";
export type Recurrence = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME";
export type TransactionStatus = "CONFIRMED" | "PENDING" | "CANCELLED";
export type TransactionType = "EXPENSE" | "INCOME" | "REFUND" | "TRANSFER";
export type TransactionSource =
  "MANUAL" | "BANK_SYNC" | "WALLET_SYNC" | "CSV_IMPORT" | "PAYMENT_PROVIDER";
export type TransactionReviewStatus = "PENDING_REVIEW" | "CONFIRMED" | "REJECTED";
export type AccountType = "CASH" | "CHECKING" | "SAVINGS" | "CREDIT" | "OTHER";
export type ExpenseBudgetMode = "DAILY" | "GLOBAL";

/** Money is stored as integer minor units (for example cents), never binary floating point. */
export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

export interface IncomeRecord {
  id: string;
  source: IncomeSource;
  description: string;
  amountMinor: number;
  currency: CurrencyCode;
  receivedOn?: string;
  expectedOn?: string;
  recurrence?: Recurrence;
  salaryPeriodId?: string;
  accountId?: string;
  status: IncomeStatus;
}

export interface ExpenseRecord {
  id: string;
  amountMinor: number;
  currency: CurrencyCode;
  category: string;
  accountId?: string;
  occurredAt: string;
  description: string;
  notes?: string;
  status: TransactionStatus;
  type: TransactionType;
  source: TransactionSource;
  reviewStatus: TransactionReviewStatus;
  budgetMode?: ExpenseBudgetMode;
  salaryPeriodId?: string;
  destinationAccountId?: string;
  externalReference?: string;
}

export interface AccountRecord {
  id: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalanceMinor: number;
}

export interface SalaryPeriod {
  id: string;
  name: string;
  currency: CurrencyCode;
  startsOn: string;
  nextSalaryOn: string;
  expectedSalaryMinor?: number;
  recurrence?: Recurrence;
}

export interface FinanceData {
  income: IncomeRecord[];
  expenses: ExpenseRecord[];
  accounts: AccountRecord[];
  salaryPeriods: SalaryPeriod[];
}

export const emptyFinanceData = (): FinanceData => ({
  income: [],
  expenses: [],
  accounts: [],
  salaryPeriods: [],
});
