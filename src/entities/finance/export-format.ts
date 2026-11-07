import type {
  AccountRecord,
  ExpenseRecord,
  FinanceData,
  IncomeRecord,
  SalaryPeriod,
} from "./models";
import {
  validateAccount,
  validateExpense,
  validateIncome,
  validateSalaryPeriod,
} from "./validation";

export interface FinoraExportV1 {
  format: "finora-export";
  version: 1;
  exportedAt: string;
  data: FinanceData;
}

export interface ImportPreview {
  records: FinanceData;
  duplicates: string[];
  errors: string[];
}

/** Pure envelope creation. Calling this function does not write a file or persist the data. */
export function createExportEnvelope(data: FinanceData, exportedAt: string): FinoraExportV1 {
  return { format: "finora-export", version: 1, exportedAt, data: cloneFinanceData(data) };
}

/** Validate untrusted imported JSON into a preview. This function never mutates a provider. */
export function previewImport(raw: unknown, existing: FinanceData): ImportPreview {
  const empty = (): ImportPreview => ({
    records: { income: [], expenses: [], accounts: [], salaryPeriods: [] },
    duplicates: [],
    errors: [],
  });
  if (
    !isObject(raw) ||
    raw.format !== "finora-export" ||
    raw.version !== 1 ||
    typeof raw.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(raw.exportedAt)) ||
    !isObject(raw.data)
  ) {
    return { ...empty(), errors: ["Unsupported or malformed Finora export envelope."] };
  }
  const data = raw.data;
  const requiredArrays = ["income", "expenses", "accounts", "salaryPeriods"] as const;
  const errors: string[] = [];
  for (const key of requiredArrays)
    if (!Array.isArray(data[key])) errors.push(`The ${key} section is missing or invalid.`);
  if (errors.length) return { ...empty(), errors };

  const preview = empty();
  const existingIds = {
    income: new Set(existing.income.map((item) => item.id)),
    expenses: new Set(existing.expenses.map((item) => item.id)),
    accounts: new Set(existing.accounts.map((item) => item.id)),
    salaryPeriods: new Set(existing.salaryPeriods.map((item) => item.id)),
  };
  const seen = {
    income: new Set<string>(),
    expenses: new Set<string>(),
    accounts: new Set<string>(),
    salaryPeriods: new Set<string>(),
  };
  const add = <T extends { id: string }>(
    key: keyof FinanceData,
    value: unknown,
    target: T[],
    validate: (record: T) => string[],
  ) => {
    if (!isObject(value) || typeof value.id !== "string") {
      errors.push(`${key}: record is missing a valid id.`);
      return;
    }
    const record = value as unknown as T;
    if (existingIds[key].has(record.id) || seen[key].has(record.id)) {
      preview.duplicates.push(`${key}:${record.id}`);
      return;
    }
    const problems = validate(record);
    if (problems.length) {
      errors.push(`${key}:${record.id}: ${problems.join(" ")}`);
      return;
    }
    seen[key].add(record.id);
    target.push(record);
  };
  for (const item of data.income as unknown[])
    add<IncomeRecord>("income", item, preview.records.income, validateIncome);
  for (const item of data.expenses as unknown[])
    add<ExpenseRecord>("expenses", item, preview.records.expenses, validateExpense);
  for (const item of data.salaryPeriods as unknown[])
    add<SalaryPeriod>("salaryPeriods", item, preview.records.salaryPeriods, validateSalaryPeriod);
  for (const item of data.accounts as unknown[])
    add<AccountRecord>("accounts", item, preview.records.accounts, validateAccount);
  detectContentDuplicates(preview.records, existing, preview.duplicates);
  validateReferences(preview.records, existing, errors);
  preview.errors.push(...errors);
  return preview;
}

function detectContentDuplicates(
  imported: FinanceData,
  existing: FinanceData,
  duplicates: string[],
) {
  const scan = <T>(
    section: keyof FinanceData,
    oldItems: T[],
    newItems: T[],
    keyOf: (item: T) => string,
  ) => {
    const keys = new Set(oldItems.map(keyOf));
    const unique: T[] = [];
    for (const item of newItems) {
      const key = keyOf(item);
      if (keys.has(key)) duplicates.push(`${section}:similar-record`);
      else {
        keys.add(key);
        unique.push(item);
      }
    }
    return unique;
  };
  imported.income = scan("income", existing.income, imported.income, (item) =>
    [
      item.source,
      item.description.trim().toLocaleLowerCase(),
      item.amountMinor,
      item.currency,
      item.receivedOn || "",
      item.expectedOn || "",
    ].join("|"),
  );
  imported.expenses = scan(
    "expenses",
    existing.expenses,
    imported.expenses,
    (item) =>
      item.externalReference ||
      [
        item.occurredAt.slice(0, 10),
        item.description.trim().toLocaleLowerCase(),
        item.amountMinor,
        item.currency,
        item.type,
      ].join("|"),
  );
  imported.accounts = scan("accounts", existing.accounts, imported.accounts, (item) =>
    [item.name.trim().toLocaleLowerCase(), item.type, item.currency].join("|"),
  );
  imported.salaryPeriods = scan(
    "salaryPeriods",
    existing.salaryPeriods,
    imported.salaryPeriods,
    (item) =>
      [item.name.trim().toLocaleLowerCase(), item.startsOn, item.nextSalaryOn, item.currency].join(
        "|",
      ),
  );
}

function validateReferences(imported: FinanceData, existing: FinanceData, errors: string[]) {
  const accounts = new Map(
    [...existing.accounts, ...imported.accounts].map((account) => [account.id, account]),
  );
  const periods = new Map(
    [...existing.salaryPeriods, ...imported.salaryPeriods].map((period) => [period.id, period]),
  );
  for (const item of [...existing.income, ...imported.income]) {
    if (item.accountId && accounts.get(item.accountId)?.currency !== item.currency)
      errors.push(`income:${item.id}: account reference is missing or has another currency.`);
    if (item.salaryPeriodId && periods.get(item.salaryPeriodId)?.currency !== item.currency)
      errors.push(`income:${item.id}: salary period reference is missing or has another currency.`);
  }
  for (const item of [...existing.expenses, ...imported.expenses]) {
    if (item.accountId && accounts.get(item.accountId)?.currency !== item.currency)
      errors.push(`expenses:${item.id}: account reference is missing or has another currency.`);
    if (
      item.destinationAccountId &&
      accounts.get(item.destinationAccountId)?.currency !== item.currency
    )
      errors.push(
        `expenses:${item.id}: destination account reference is missing or has another currency.`,
      );
    if (item.salaryPeriodId && periods.get(item.salaryPeriodId)?.currency !== item.currency)
      errors.push(
        `expenses:${item.id}: salary period reference is missing or has another currency.`,
      );
  }
  const allPeriods = [...existing.salaryPeriods, ...imported.salaryPeriods];
  for (let index = 0; index < allPeriods.length; index++)
    for (let next = index + 1; next < allPeriods.length; next++) {
      const first = allPeriods[index];
      const second = allPeriods[next];
      if (
        first.currency === second.currency &&
        first.startsOn < second.nextSalaryOn &&
        second.startsOn < first.nextSalaryOn
      )
        errors.push(`salaryPeriods:${second.id}: period overlaps ${first.id}.`);
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function cloneFinanceData(data: FinanceData): FinanceData {
  return {
    income: data.income.map((item) => ({ ...item })),
    expenses: data.expenses.map((item) => ({ ...item })),
    accounts: data.accounts.map((item) => ({ ...item })),
    salaryPeriods: data.salaryPeriods.map((item) => ({ ...item })),
  };
}
