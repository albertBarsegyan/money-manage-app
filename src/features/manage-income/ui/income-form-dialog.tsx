"use client";

import { useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  parseMoney,
  INCOME_SOURCES,
  RECURRENCES,
  type AccountRecord,
  type IncomeRecord,
  type SalaryPeriod,
} from "@/entities/finance";
import { FormActions, FormField, FormSelect, Input, RecordDialog } from "@/shared/ui";
import { AccountSelect, MoneyField } from "@/entities/finance";
import { getLocalDate } from "@/shared/lib/date";
import { incomeSchema, type IncomeFormValues } from "../model/schema";

const incomeSourceOptions = INCOME_SOURCES.map(({ value, label }) => ({ value, label }));
const recurrenceOptions = RECURRENCES.map(({ value, label }) => ({ value, label }));
const incomeStatusOptions = [
  { value: "EXPECTED", label: "Expected" },
  { value: "RECEIVED", label: "Received" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function IncomeFormDialog({
  initial,
  salaryPeriods,
  accounts,
  onClose,
  onSave,
}: {
  initial?: IncomeRecord;
  salaryPeriods: SalaryPeriod[];
  accounts: AccountRecord[];
  onClose: () => void;
  onSave: (record: IncomeRecord) => void;
}) {
  const form = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      source: initial?.source ?? "SALARY",
      description: initial?.description ?? "",
      amount: initial ? (initial.amountMinor / 100).toFixed(2) : "",
      currency: initial?.currency ?? "AMD",
      receivedOn: initial?.receivedOn ?? "",
      expectedOn: initial?.expectedOn ?? "",
      recurrence: initial?.recurrence ?? "MONTHLY",
      salaryPeriodId: initial?.salaryPeriodId ?? "",
      accountId: initial?.accountId ?? "",
      status: initial?.status ?? "EXPECTED",
    },
  });
  const [amount, currency, accountId, source, recurrence, salaryPeriodId, status] = useWatch({
    control: form.control,
    name: ["amount", "currency", "accountId", "source", "recurrence", "salaryPeriodId", "status"],
  });
  const accountOptions = useMemo(
    () => accounts.filter((account) => account.currency === currency),
    [accounts, currency],
  );
  const salaryPeriodOptions = useMemo(
    () =>
      salaryPeriods
        .filter((period) => period.currency === currency)
        .map((period) => ({ value: period.id, label: period.name })),
    [currency, salaryPeriods],
  );
  const setCurrency = (nextCurrency: IncomeFormValues["currency"]) => {
    form.setValue("currency", nextCurrency, { shouldDirty: true, shouldValidate: true });
    if (accounts.some((account) => account.id === accountId && account.currency !== nextCurrency)) {
      form.setValue("accountId", "", { shouldDirty: true, shouldValidate: true });
    }
    if (
      salaryPeriods.some(
        (period) => period.id === salaryPeriodId && period.currency !== nextCurrency,
      )
    ) {
      form.setValue("salaryPeriodId", "", { shouldDirty: true, shouldValidate: true });
    }
  };

  const submit = form.handleSubmit((values) => {
    const amountMinor = parseMoney(values.amount, values.currency);
    if (!amountMinor) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      source: values.source,
      description: values.description.trim(),
      amountMinor,
      currency: values.currency,
      receivedOn:
        values.status === "RECEIVED"
          ? values.receivedOn || getLocalDate()
          : values.receivedOn || undefined,
      expectedOn: values.expectedOn || undefined,
      recurrence: values.recurrence || undefined,
      salaryPeriodId: values.salaryPeriodId || undefined,
      accountId: values.accountId || undefined,
      status: values.status,
    });
  });

  return (
    <RecordDialog
      title={initial ? "Edit income" : "Add income"}
      description="INCOME RECORD"
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Income source"
            value={source}
            options={incomeSourceOptions}
            onValueChange={(value) =>
              form.setValue("source", value as IncomeFormValues["source"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            error={form.formState.errors.source?.message}
          />
          <MoneyField
            label="Amount"
            value={amount}
            onChange={(value) =>
              form.setValue("amount", value, { shouldDirty: true, shouldValidate: true })
            }
            currency={currency}
            onCurrency={(value) => setCurrency(value)}
            error={form.formState.errors.amount?.message}
            name="amount"
          />
        </div>
        <FormField label="Description" error={form.formState.errors.description?.message}>
          <Input
            autoFocus
            placeholder="Salary, client invoice…"
            {...form.register("description")}
            aria-invalid={Boolean(form.formState.errors.description)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Expected date" error={form.formState.errors.expectedOn?.message}>
            <Input
              type="date"
              {...form.register("expectedOn")}
              aria-invalid={Boolean(form.formState.errors.expectedOn)}
            />
          </FormField>
          <FormField label="Received date" error={form.formState.errors.receivedOn?.message}>
            <Input
              type="date"
              {...form.register("receivedOn")}
              aria-invalid={Boolean(form.formState.errors.receivedOn)}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Recurring schedule"
            value={recurrence}
            options={recurrenceOptions}
            emptyOption="No recurrence"
            onValueChange={(value) =>
              form.setValue("recurrence", value as IncomeFormValues["recurrence"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <FormSelect
            label="Salary period"
            value={salaryPeriodId}
            options={salaryPeriodOptions}
            emptyOption="Unassigned"
            onValueChange={(value) =>
              form.setValue("salaryPeriodId", value, { shouldDirty: true, shouldValidate: true })
            }
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <AccountSelect
            label="Account (optional)"
            value={accountId}
            onChange={(value) => form.setValue("accountId", value, { shouldDirty: true })}
            accounts={accountOptions}
            optional
          />
          <FormSelect
            label="Status"
            value={status}
            options={incomeStatusOptions}
            onValueChange={(value) =>
              form.setValue("status", value as IncomeFormValues["status"], {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Expected income stays outside your available budget until you confirm receipt.
        </p>
        <FormActions
          onCancel={onClose}
          submit={initial ? "Save changes" : "Save income"}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </RecordDialog>
  );
}
