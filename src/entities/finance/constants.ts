import type { CurrencyCode, IncomeSource, Recurrence } from "./models";

export const CURRENCIES: CurrencyCode[] = ["AMD", "USD", "EUR", "GBP"];
export const INCOME_SOURCES: Array<{ value: IncomeSource; label: string }> = [
  { value: "SALARY", label: "Salary" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "BUSINESS", label: "Business" },
  { value: "BONUS", label: "Bonus" },
  { value: "OTHER", label: "Other" },
];
export const EXPENSE_CATEGORIES = [
  "Food & drink",
  "Groceries",
  "Transport",
  "Fuel",
  "Shopping",
  "Entertainment",
  "Subscriptions",
  "Bills",
  "Healthcare",
  "Other",
] as const;
export const RECURRENCES: Array<{ value: Recurrence; label: string }> = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every two weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "YEARLY", label: "Yearly" },
];
