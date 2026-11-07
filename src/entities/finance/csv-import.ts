import type { CurrencyCode, ExpenseRecord, TransactionType } from "./models";
import { isCurrency } from "./validation";
import { parseMoney } from "./calculations/money";

export interface CsvImportIssue {
  row: number;
  reason: string;
}
export interface CsvImportPreview {
  records: ExpenseRecord[];
  issues: CsvImportIssue[];
}

/** Accepts common CSV headers; returns review candidates only and never writes them anywhere. */
export function previewCsvImport(text: string, existing: ExpenseRecord[]): CsvImportPreview {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((row) => row.trim())
    .map(parseCsvRow);
  if (rows.length < 2)
    return {
      records: [],
      issues: [{ row: 1, reason: "CSV needs a header and at least one data row." }],
    };
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const index = (...names: string[]) =>
    names.map((name) => header.indexOf(name)).find((value) => value >= 0) ?? -1;
  const dateColumn = index("date", "transaction date", "booked at");
  const descriptionColumn = index("description", "title", "name", "merchant");
  const amountColumn = index("amount", "value");
  if (dateColumn < 0 || descriptionColumn < 0 || amountColumn < 0)
    return {
      records: [],
      issues: [{ row: 1, reason: "Required columns: date, description, amount." }],
    };
  const currencyColumn = index("currency", "currency code");
  const categoryColumn = index("category");
  const accountColumn = index("account", "account name");
  const records: ExpenseRecord[] = [];
  const issues: CsvImportIssue[] = [];
  const seen = new Set(existing.map(fingerprint));
  rows.slice(1).forEach((cells, offset) => {
    const rowNumber = offset + 2;
    const date = cells[dateColumn]?.trim() || "";
    const description = cells[descriptionColumn]?.trim() || "";
    const currencyText = (currencyColumn < 0 ? "AMD" : cells[currencyColumn] || "AMD")
      .trim()
      .toUpperCase();
    const currency: CurrencyCode | null = isCurrency(currencyText) ? currencyText : null;
    const rawAmount = (cells[amountColumn] || "")
      .trim()
      .replace(/[,$€£֏\s]/g, "")
      .replace(/^\((.*)\)$/, "-$1");
    const amountMinor = currency ? parseMoney(rawAmount.replace(/^-/, ""), currency) : null;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !description ||
      !currency ||
      !amountMinor ||
      amountMinor <= 0
    ) {
      issues.push({ row: rowNumber, reason: "Invalid date, description, currency, or amount." });
      return;
    }
    const negative = rawAmount.startsWith("-");
    const category = cells[categoryColumn]?.trim() || "Uncategorized";
    const accountName = cells[accountColumn]?.trim() || "Imported account";
    const type: TransactionType = /\btransfer\b/i.test(`${category} ${description}`)
      ? "TRANSFER"
      : /refund|reversal/i.test(`${category} ${description}`)
        ? "REFUND"
        : negative
          ? "EXPENSE"
          : "INCOME";
    const stable = `${date}|${description.toLocaleLowerCase()}|${amountMinor}|${currency}|${accountName.toLocaleLowerCase()}`;
    const record: ExpenseRecord = {
      id: `csv-${stable}`.replace(/[^a-z0-9|.-]/gi, "_"),
      amountMinor,
      currency,
      category: type === "TRANSFER" ? "Transfer" : category,
      occurredAt: `${date}T12:00`,
      description,
      status: "PENDING",
      type,
      source: "CSV_IMPORT",
      reviewStatus: "PENDING_REVIEW",
      externalReference: stable,
    };
    const key = fingerprint(record);
    if (seen.has(key)) return;
    seen.add(key);
    records.push(record);
  });
  return { records, issues };
}

function fingerprint(record: ExpenseRecord) {
  return (
    record.externalReference ||
    [
      record.occurredAt.slice(0, 10),
      record.description.toLocaleLowerCase(),
      record.amountMinor,
      record.currency,
    ].join("|")
  );
}

function parseCsvRow(line: string) {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      field += '"';
      index++;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      fields.push(field);
      field = "";
    } else field += char;
  }
  fields.push(field);
  return fields;
}
