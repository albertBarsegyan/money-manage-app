"use client";

import { useState, type FormEvent } from "react";
import {
  EXPENSE_CATEGORIES,
  parseMoney,
  type AccountRecord,
  type CurrencyCode,
  type ExpenseBudgetMode,
  type ExpenseRecord,
  type MonitoredCardRecord,
  type TransactionType,
} from "@/entities/finance";
import { FormActions, FormField, FormSelect, Input, RecordDialog } from "@/shared/ui";
import { getLocalDateTime } from "@/shared/lib/date";
import type { DetectedTransaction } from "../notification-reader";

const currencyOptions = ["AMD", "USD", "EUR", "GBP"].map((currency) => ({
  value: currency,
  label: currency,
}));
const categoryOptions = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));
const typeOptions = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
];
const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "GLOBAL", label: "Global (one-time)" },
];

export function ReaderTransactionDialog({
  candidate,
  cards,
  accounts,
  onClose,
  onIgnore,
  onSave,
}: {
  candidate: DetectedTransaction;
  cards: MonitoredCardRecord[];
  accounts: AccountRecord[];
  onClose: () => void;
  onIgnore: () => void;
  onSave: (record: ExpenseRecord) => void;
}) {
  const matchedCard = cards.find((card) => card.id === candidate.cardId);
  const [amount, setAmount] = useState((candidate.amountMinor / 100).toFixed(2));
  const [currency, setCurrency] = useState<CurrencyCode>(candidate.currency);
  const [type, setType] = useState<TransactionType>(candidate.type);
  const [budgetMode, setBudgetMode] = useState<ExpenseBudgetMode>("GLOBAL");
  const [category, setCategory] = useState("Other");
  const [merchant, setMerchant] = useState(candidate.merchant);
  const [accountId, setAccountId] = useState(matchedCard?.accountId ?? "");
  const [occurredAt, setOccurredAt] = useState(() => {
    const date = new Date(candidate.occurredAt);
    return Number.isFinite(date.getTime()) ? getLocalDateTime(date) : getLocalDateTime();
  });
  const [error, setError] = useState("");
  const matchingAccounts = accounts.filter((account) => account.currency === currency);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountMinor = parseMoney(amount, currency);
    if (!amountMinor) {
      setError("Enter a valid transaction amount.");
      return;
    }
    if (!merchant.trim()) {
      setError("Enter a merchant or transaction description.");
      return;
    }
    if (!occurredAt || !Number.isFinite(Date.parse(occurredAt))) {
      setError("Choose a valid transaction date.");
      return;
    }
    if (accountId && !matchingAccounts.some((account) => account.id === accountId)) {
      setError("Choose an account with the same currency.");
      return;
    }
    const wallet = /wallet|google.?pay/i.test(candidate.packageName);
    onSave({
      id: crypto.randomUUID(),
      amountMinor,
      currency,
      category: type === "INCOME" ? "Income" : category,
      accountId: accountId || undefined,
      occurredAt,
      description: merchant.trim(),
      status: "CONFIRMED",
      type,
      source: wallet ? "WALLET_SYNC" : "BANK_SYNC",
      reviewStatus: "CONFIRMED",
      budgetMode: type === "EXPENSE" ? budgetMode : undefined,
      externalReference: candidate.id,
    });
  };

  return (
    <RecordDialog
      title="Review detected transaction"
      description="CONFIRM BEFORE SAVING"
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="reader-detected-summary">
          <span>{candidate.packageName}</span>
          <b>
            {matchedCard?.name ??
              (candidate.lastFour ? `Card ending ${candidate.lastFour}` : "Card not matched")}
          </b>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Amount">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </FormField>
          <FormSelect
            label="Currency"
            value={currency}
            options={currencyOptions}
            onValueChange={(value) => {
              setCurrency(value as CurrencyCode);
              setAccountId("");
            }}
          />
        </div>
        <FormSelect
          label="Transaction type"
          value={type}
          options={typeOptions}
          onValueChange={(value) => {
            setType(value as TransactionType);
            if (value === "INCOME") setBudgetMode("GLOBAL");
          }}
        />
        {type === "EXPENSE" && (
          <FormSelect
            label="Frequency"
            value={budgetMode}
            options={frequencyOptions}
            onValueChange={(value) => setBudgetMode(value as ExpenseBudgetMode)}
          />
        )}
        {type === "EXPENSE" && (
          <FormSelect
            label="Category"
            value={category}
            options={categoryOptions}
            onValueChange={setCategory}
          />
        )}
        <FormField label="Merchant">
          <Input value={merchant} onChange={(event) => setMerchant(event.target.value)} />
        </FormField>
        <FormSelect
          label="Account or card"
          value={accountId}
          options={matchingAccounts.map((account) => ({ value: account.id, label: account.name }))}
          emptyOption="No linked account"
          onValueChange={setAccountId}
        />
        <FormField label="Transaction date and time">
          <Input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
          />
        </FormField>
        <p className="reader-review-note">
          This transaction will be saved only after you confirm it below. The notification text
          stays on this device.
        </p>
        {error && (
          <p className="reader-error" role="alert">
            {error}
          </p>
        )}
        <div className="reader-confirm-actions">
          <button type="button" className="danger-button" onClick={onIgnore}>
            Ignore detection
          </button>
          <FormActions onCancel={onClose} submit="Confirm and save" />
        </div>
      </form>
    </RecordDialog>
  );
}
