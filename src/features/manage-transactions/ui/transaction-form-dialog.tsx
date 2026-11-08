"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EXPENSE_CATEGORIES,
  parseMoney,
  type TransactionStatus,
  type TransactionType,
  type AccountRecord,
  type ExpenseRecord,
  type ExpenseBudgetMode,
} from "@/entities/finance";
import { AccountSelect, MoneyField } from "@/entities/finance";
import {
  Button,
  FormActions,
  FormField,
  FormSelect,
  Input,
  RecordDialog,
  Textarea,
} from "@/shared/ui";
import { getLocalDateTime } from "@/shared/lib/date";
import { transactionSchema, type TransactionFormValues } from "../model/schema";

const transactionTypeOptions = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
  { value: "REFUND", label: "Refund" },
  { value: "TRANSFER", label: "Transfer between my accounts" },
];
const transactionStatusOptions = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING", label: "Pending" },
  { value: "CANCELLED", label: "Cancelled" },
];
const budgetModeOptions = [
  { value: "DAILY", label: "Daily expense" },
  { value: "GLOBAL", label: "Global expense" },
];
const categoryOptions = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function TransactionFormDialog({
  initial,
  defaultBudgetMode = "GLOBAL",
  accounts,
  onClose,
  onSave,
}: {
  initial?: ExpenseRecord;
  defaultBudgetMode?: ExpenseBudgetMode;
  accounts: AccountRecord[];
  onClose: () => void;
  onSave: (record: ExpenseRecord) => void;
}) {
  const [showMoreSettings, setShowMoreSettings] = useState(Boolean(initial));
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initial?.type ?? "EXPENSE",
      budgetMode: initial?.budgetMode ?? defaultBudgetMode,
      description: initial?.description ?? "",
      amount: initial ? (initial.amountMinor / 100).toFixed(2) : "",
      currency: initial?.currency ?? "AMD",
      category: initial?.category ?? EXPENSE_CATEGORIES[0],
      accountId: initial?.accountId ?? "",
      destinationAccountId: initial?.destinationAccountId ?? "",
      occurredAt: initial?.occurredAt ?? getLocalDateTime(),
      status: initial?.status ?? "CONFIRMED",
      notes: initial?.notes ?? "",
    },
  });
  const [amount, currency, type, budgetMode, accountId, destinationAccountId, status, category] =
    useWatch({
      control: form.control,
      name: [
        "amount",
        "currency",
        "type",
        "budgetMode",
        "accountId",
        "destinationAccountId",
        "status",
        "category",
      ],
    });
  const matchingAccounts = useMemo(
    () => accounts.filter((account) => account.currency === currency),
    [accounts, currency],
  );

  const submit = form.handleSubmit((values) => {
    const amountMinor = parseMoney(values.amount, values.currency);
    if (!amountMinor) return;
    const confirmed = values.status === "CONFIRMED";
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      amountMinor,
      currency: values.currency,
      category: values.type === "TRANSFER" ? "Transfer" : values.category,
      accountId: values.accountId || undefined,
      occurredAt: values.occurredAt,
      description: values.description.trim(),
      notes: values.notes.trim() || undefined,
      status: values.status,
      type: values.type,
      budgetMode: values.type === "EXPENSE" ? values.budgetMode : undefined,
      source: initial?.source ?? "MANUAL",
      reviewStatus:
        initial?.source !== "MANUAL" && !confirmed
          ? "PENDING_REVIEW"
          : confirmed
            ? "CONFIRMED"
            : "PENDING_REVIEW",
      destinationAccountId:
        values.type === "TRANSFER" ? values.destinationAccountId || undefined : undefined,
      externalReference: initial?.externalReference,
    });
  });

  return (
    <RecordDialog
      title={initial ? "Edit transaction" : "Add a transaction"}
      description="FINANCIAL ACTIVITY"
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <MoneyField
          label="Amount"
          value={amount}
          onChange={(value) =>
            form.setValue("amount", value, { shouldDirty: true, shouldValidate: true })
          }
          currency={currency}
          onCurrency={(value) =>
            form.setValue("currency", value, { shouldDirty: true, shouldValidate: true })
          }
          error={form.formState.errors.amount?.message}
          name="amount"
        />
        {type === "EXPENSE" && (
          <FormSelect
            label="Budget handling"
            value={budgetMode}
            options={budgetModeOptions}
            onValueChange={(value) =>
              form.setValue("budgetMode", value as ExpenseBudgetMode, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        )}
        <FormField
          label={
            type === "REFUND"
              ? "Refund from"
              : type === "TRANSFER"
                ? "Transfer description"
                : type === "INCOME"
                  ? "Income source (optional)"
                  : "Description (optional)"
          }
          error={form.formState.errors.description?.message}
        >
          <Input
            placeholder="What was this for?"
            {...form.register("description")}
            aria-invalid={Boolean(form.formState.errors.description)}
          />
        </FormField>
        <FormSelect
          label="Category (optional)"
          value={category}
          options={categoryOptions}
          disabled={type === "TRANSFER"}
          onValueChange={(value) =>
            form.setValue("category", value, { shouldDirty: true, shouldValidate: true })
          }
          error={form.formState.errors.category?.message}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={showMoreSettings}
          onClick={() => setShowMoreSettings((visible) => !visible)}
          className="w-fit justify-start px-1 text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {showMoreSettings ? "Show fewer settings" : "Add more info"}
        </Button>
        {showMoreSettings && (
          <div className="grid gap-4 border-t border-border pt-4">
            <FormSelect
              label="Type"
              value={type}
              options={transactionTypeOptions}
              onValueChange={(value) =>
                form.setValue("type", value as TransactionType, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />
            {type === "TRANSFER" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <AccountSelect
                  label="From account"
                  value={accountId}
                  onChange={(value) =>
                    form.setValue("accountId", value, { shouldDirty: true, shouldValidate: true })
                  }
                  accounts={matchingAccounts}
                  error={form.formState.errors.accountId?.message}
                />
                <AccountSelect
                  label="To account"
                  value={destinationAccountId}
                  onChange={(value) =>
                    form.setValue("destinationAccountId", value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  accounts={matchingAccounts}
                  error={form.formState.errors.destinationAccountId?.message}
                />
              </div>
            ) : (
              <AccountSelect
                label="Account (optional)"
                value={accountId}
                onChange={(value) => form.setValue("accountId", value, { shouldDirty: true })}
                accounts={matchingAccounts}
                optional
              />
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Date and time" error={form.formState.errors.occurredAt?.message}>
                <Input
                  type="datetime-local"
                  {...form.register("occurredAt")}
                  aria-invalid={Boolean(form.formState.errors.occurredAt)}
                />
              </FormField>
              <FormSelect
                label="Status"
                value={status}
                options={transactionStatusOptions}
                onValueChange={(value) =>
                  form.setValue("status", value as TransactionStatus, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
            </div>
            <FormField label="Notes (optional)" error={form.formState.errors.notes?.message}>
              <Textarea rows={3} placeholder="Add a note" {...form.register("notes")} />
            </FormField>
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              {type === "TRANSFER"
                ? "Transfers between your accounts are excluded from spending."
                : type === "REFUND"
                  ? "Confirmed refunds increase the remaining budget."
                  : type === "INCOME"
                    ? "Confirmed income increases the available budget."
                    : budgetMode === "DAILY"
                      ? "Daily expenses reduce today’s remaining amount. They are included in the period balance tomorrow."
                      : "Global expenses reduce the period balance and recalculate today’s budget immediately."}
            </p>
          </div>
        )}
        <FormActions
          onCancel={onClose}
          submit={initial ? "Save changes" : "Save transaction"}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </RecordDialog>
  );
}
