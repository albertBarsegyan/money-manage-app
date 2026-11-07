import {
  formatMoney,
  type AccountRecord,
  type AccountType,
  type CurrencyCode,
  type ExpenseRecord,
  type IncomeSource,
  type Recurrence,
} from "@/entities/finance";

export function currencySymbol(currency: CurrencyCode) {
  return currency === "AMD" ? "֏" : currency === "USD" ? "$" : currency === "EUR" ? "€" : "£";
}
export function amountLabel(amountMinor: number, currency: CurrencyCode) {
  return formatMoney({ amountMinor, currency }, "en");
}
export function displayDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
}
export function daysLabel(days: number) {
  return days === 1 ? "1 day" : `${days} days`;
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    arrows: "M7 7h13l-4-4m4 4-4 4M17 17H4l4 4m-4-4 4-4",
    wallet:
      "M20 8V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v10H5a3 3 0 0 1-3-3V6m18 5h-5a2 2 0 0 0 0 4h5z",
    chart: "M3 3v18h18M8 15l4-4 4 4 6-7",
    bank: "M3 10h18M5 10V6l7-4 7 4v4M5 10v9m4-9v9m6-9v9m4-9v9M3 21h18",
    plus: "M12 5v14m-7-7h14",
    chevron: "m9 18 6-6-6-6",
    close: "M18 6 6 18M6 6l12 12",
    search: "m20 20-4-4m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0",
    shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z",
    settings:
      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6v2m0 16v2m10-10h-2M4 12H2m17.07 7.07-1.42-1.42M6.35 6.35 4.93 4.93m14.14 0-1.42 1.42M6.35 17.65l-1.42 1.42",
    trash: "M3 6h18m-2 0-.9 14H5.9L5 6m3 0V4h8v2m-7 4v6m4-6v6",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m4-5 5 5 5-5m-5 5V3",
    arrow: "M7 17 17 7M7 7h10v10",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}

export function EmptyState({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">◌</div>
      <b>{title}</b>
      <span>{text}</span>
      {action && onAction && (
        <button className="text-link" onClick={onAction}>
          {action} <Icon name="chevron" size={14} />
        </button>
      )}
    </div>
  );
}
export function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
export function accountName(accounts: AccountRecord[], id?: string) {
  if (!id) return "No account";
  return accounts.find((account) => account.id === id)?.name || "Account removed";
}
export function accountTypeLabel(type: AccountType) {
  return {
    CASH: "CASH",
    CHECKING: "CHECKING",
    SAVINGS: "SAVINGS",
    CREDIT: "CREDIT",
    OTHER: "OTHER",
  }[type];
}
export function sourceLabel(source: IncomeSource | ExpenseRecord["source"]) {
  const labels: Record<string, string> = {
    SALARY: "Salary",
    FREELANCE: "Freelance",
    BUSINESS: "Business",
    BONUS: "Bonus",
    OTHER: "Other",
    MANUAL: "Manual",
    BANK_SYNC: "Bank sync",
    WALLET_SYNC: "Wallet sync",
    CSV_IMPORT: "CSV import",
    PAYMENT_PROVIDER: "Payment provider",
  };
  return labels[source] || source;
}
export function recurrenceLabel(recurrence: Recurrence) {
  return {
    ONE_TIME: "One-time",
    WEEKLY: "Weekly",
    BIWEEKLY: "Every two weeks",
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    YEARLY: "Yearly",
  }[recurrence];
}
