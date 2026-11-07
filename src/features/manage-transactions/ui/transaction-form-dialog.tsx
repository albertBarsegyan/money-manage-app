"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EXPENSE_CATEGORIES,
  parseMoney,
  type TransactionStatus,
  type TransactionType,
  type AccountRecord,
  type ExpenseRecord,
} from "@/entities/finance";
import { AccountSelect, MoneyField } from "@/entities/finance";
import { FormActions, FormField, FormSelect, Input, RecordDialog, Textarea } from "@/shared/ui";
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
const categoryOptions = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function TransactionFormDialog({
  initial,
  accounts,
  onClose,
  onSave,
}: {
  initial?: ExpenseRecord;
  accounts: AccountRecord[];
  onClose: () => void;
  onSave: (record: ExpenseRecord) => void;
}) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initial?.type ?? "EXPENSE",
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
  const [amount, currency, type, accountId, destinationAccountId, status, category] = useWatch({
    control: form.control,
    name: ["amount", "currency", "type", "accountId", "destinationAccountId", "status", "category"],
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
        <FormField
          label={
            type === "REFUND"
              ? "Refund from"
              : type === "TRANSFER"
                ? "Transfer description"
                : type === "INCOME"
                  ? "Income source"
                  : "Description"
          }
          error={form.formState.errors.description?.message}
        >
          <Input
            autoFocus
            placeholder="What was this for?"
            {...form.register("description")}
            aria-invalid={Boolean(form.formState.errors.description)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <FormSelect
            label="Category"
            value={category}
            options={categoryOptions}
            disabled={type === "TRANSFER"}
            onValueChange={(value) =>
              form.setValue("category", value, { shouldDirty: true, shouldValidate: true })
            }
            error={form.formState.errors.category?.message}
          />
        </div>
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
                : "Only confirmed expenses affect the budget."}
        </p>
        <FormActions
          onCancel={onClose}
          submit={initial ? "Save changes" : "Save transaction"}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </RecordDialog>
  );
}
