import type {
  AccountRecord,
  CurrencyCode,
  ExpenseRecord,
  IncomeRecord,
  MonitoredCardRecord,
  SalaryPeriod,
} from "./models";

const currencies: CurrencyCode[] = ["AMD", "USD", "EUR", "GBP"];
export function isCurrency(value: string): value is CurrencyCode {
  return currencies.includes(value as CurrencyCode);
}
export function validateMinorAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function validateIncome(input: IncomeRecord): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["Income record is malformed."];
  if (typeof input.id !== "string" || !input.id.trim()) errors.push("Income id is required.");
  if (typeof input.description !== "string") errors.push("Description must be a string.");
  if (!validateMinorAmount(input.amountMinor) || input.amountMinor === 0)
    errors.push("Amount must be a positive safe integer in minor units.");
  if (!isCurrency(input.currency)) errors.push("Choose a supported currency.");
  if (!["SALARY", "FREELANCE", "BUSINESS", "BONUS", "OTHER"].includes(input.source))
    errors.push("Choose a supported income source.");
  if (!["EXPECTED", "RECEIVED", "CANCELLED"].includes(input.status))
    errors.push("Choose a supported income status.");
  if (
    input.recurrence !== undefined &&
    !["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].includes(input.recurrence)
  )
    errors.push("Choose a supported recurrence.");
  if (input.receivedOn && !isIsoDate(input.receivedOn))
    errors.push("Received date must be a valid calendar date.");
  if (input.expectedOn && !isIsoDate(input.expectedOn))
    errors.push("Expected date must be a valid calendar date.");
  if (input.receivedOn !== undefined && typeof input.receivedOn !== "string")
    errors.push("Received date must be a string.");
  if (input.expectedOn !== undefined && typeof input.expectedOn !== "string")
    errors.push("Expected date must be a string.");
  if (input.accountId !== undefined && typeof input.accountId !== "string")
    errors.push("Account reference must be a string.");
  if (input.salaryPeriodId !== undefined && typeof input.salaryPeriodId !== "string")
    errors.push("Salary period reference must be a string.");
  if (input.status === "RECEIVED" && !input.receivedOn)
    errors.push("A received income record needs a received date.");
  return errors;
}

export function validateAccount(input: AccountRecord): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["Account record is malformed."];
  if (typeof input.id !== "string" || !input.id.trim()) errors.push("Account id is required.");
  if (typeof input.name !== "string" || !input.name.trim())
    errors.push("Account name is required.");
  if (!isCurrency(input.currency)) errors.push("Choose a supported currency.");
  if (!Number.isSafeInteger(input.openingBalanceMinor))
    errors.push("Opening balance must use integer minor units.");
  if (!["CASH", "CHECKING", "SAVINGS", "CREDIT", "OTHER"].includes(input.type))
    errors.push("Choose a supported account type.");
  return errors;
}

export function validateMonitoredCard(input: MonitoredCardRecord): string[] {
  if (!isRecord(input)) return ["Monitored card record is malformed."];
  const errors: string[] = [];
  if (typeof input.id !== "string" || !input.id.trim()) errors.push("Card id is required.");
  if (typeof input.name !== "string" || !input.name.trim()) errors.push("Card name is required.");
  if (typeof input.bankName !== "string") errors.push("Bank name must be a string.");
  if (!["DEBIT", "CREDIT", "PREPAID", "ACCOUNT"].includes(input.type))
    errors.push("Choose a supported card type.");
  if (input.lastFour !== undefined && !/^\d{4}$/.test(input.lastFour))
    errors.push("Enter only the last four digits.");
  if (!isCurrency(input.currency)) errors.push("Choose a supported currency.");
  if (input.accountId !== undefined && typeof input.accountId !== "string")
    errors.push("Account reference must be a string.");
  if (typeof input.monitoringEnabled !== "boolean") errors.push("Choose a monitoring setting.");
  return errors;
}

export function validateExpense(input: ExpenseRecord): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["Transaction record is malformed."];
  if (typeof input.id !== "string" || !input.id.trim()) errors.push("Transaction id is required.");
  if (typeof input.description !== "string") errors.push("Description must be a string.");
  if (typeof input.category !== "string" || !input.category.trim())
    errors.push("Choose a category.");
  if (!validateMinorAmount(input.amountMinor) || input.amountMinor === 0)
    errors.push("Amount must be a positive safe integer in minor units.");
  if (!isCurrency(input.currency)) errors.push("Choose a supported currency.");
  if (input.budgetMode !== undefined && !["DAILY", "GLOBAL"].includes(input.budgetMode))
    errors.push("Choose a supported expense budget mode.");
  if (typeof input.occurredAt !== "string" || !Number.isFinite(Date.parse(input.occurredAt)))
    errors.push("Choose a valid transaction date and time.");
  if (!["CONFIRMED", "PENDING", "CANCELLED"].includes(input.status))
    errors.push("Choose a supported transaction status.");
  if (!["EXPENSE", "INCOME", "REFUND", "TRANSFER"].includes(input.type))
    errors.push("Choose a supported transaction type.");
  if (
    !["MANUAL", "BANK_SYNC", "WALLET_SYNC", "CSV_IMPORT", "PAYMENT_PROVIDER"].includes(input.source)
  )
    errors.push("Choose a supported transaction source.");
  if (!["PENDING_REVIEW", "CONFIRMED", "REJECTED"].includes(input.reviewStatus))
    errors.push("Choose a supported review status.");
  if (
    input.type === "TRANSFER" &&
    input.status === "CONFIRMED" &&
    (!input.accountId ||
      !input.destinationAccountId ||
      input.accountId === input.destinationAccountId)
  )
    errors.push("Choose two different owned accounts for a confirmed transfer.");
  return errors;
}

export function validateSalaryPeriod(input: SalaryPeriod): string[] {
  const errors: string[] = [];
  if (!isRecord(input)) return ["Salary period is malformed."];
  if (typeof input.id !== "string" || !input.id.trim())
    errors.push("Salary period id is required.");
  if (typeof input.name !== "string" || !input.name.trim()) errors.push("Name your salary period.");
  if (!isIsoDate(input.startsOn) || !isIsoDate(input.nextSalaryOn))
    errors.push("Use valid dates for the salary period.");
  if (input.nextSalaryOn < input.startsOn)
    errors.push("Next salary date must be on or after the period start.");
  if (!isCurrency(input.currency)) errors.push("Choose a supported currency.");
  if (
    input.expectedSalaryMinor !== undefined &&
    (!validateMinorAmount(input.expectedSalaryMinor) || input.expectedSalaryMinor === 0)
  )
    errors.push("Expected salary must be a positive amount.");
  if (
    input.recurrence !== undefined &&
    !["ONE_TIME", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"].includes(input.recurrence)
  )
    errors.push("Choose a supported recurrence.");
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
