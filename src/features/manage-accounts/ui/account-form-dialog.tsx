"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseMoney, type AccountRecord, type AccountType } from "@/entities/finance";
import { MoneyField } from "@/entities/finance";
import { FormActions, FormField, FormSelect, Input, RecordDialog } from "@/shared/ui";
import { accountSchema, type AccountFormValues } from "../model/schema";

const accountTypeOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CHECKING", label: "Checking" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CREDIT", label: "Credit" },
  { value: "OTHER", label: "Other" },
] satisfies Array<{ value: AccountType; label: string }>;

export function AccountFormDialog({
  initial,
  onClose,
  onSave,
}: {
  initial?: AccountRecord;
  onClose: () => void;
  onSave: (record: AccountRecord) => void;
}) {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initial?.name ?? "",
      type: initial?.type ?? "CASH",
      currency: initial?.currency ?? "AMD",
      balance: initial ? (initial.openingBalanceMinor / 100).toFixed(2) : "",
    },
  });
  const [balance, currency, type] = useWatch({
    control: form.control,
    name: ["balance", "currency", "type"],
  });

  const submit = form.handleSubmit((values) => {
    const openingBalanceMinor = parseMoney(values.balance || "0", values.currency);
    if (openingBalanceMinor === null) return;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: values.name.trim(),
      type: values.type,
      currency: values.currency,
      openingBalanceMinor,
    });
  });

  return (
    <RecordDialog
      title={initial ? "Edit account" : "Add an account"}
      description="MANUAL ACCOUNT"
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <FormField label="Account name" error={form.formState.errors.name?.message}>
          <Input
            autoFocus
            placeholder="Cash, checking, savings…"
            {...form.register("name")}
            aria-invalid={Boolean(form.formState.errors.name)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Account type"
            value={type}
            options={accountTypeOptions}
            onValueChange={(value) =>
              form.setValue("type", value as AccountType, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          <MoneyField
            label="Opening balance"
            value={balance}
            onChange={(value) =>
              form.setValue("balance", value, { shouldDirty: true, shouldValidate: true })
            }
            currency={currency}
            onCurrency={(value) =>
              form.setValue("currency", value, { shouldDirty: true, shouldValidate: true })
            }
            error={form.formState.errors.balance?.message}
            name="balance"
          />
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          This is an account you enter manually. No bank connection is created.
        </p>
        <FormActions
          onCancel={onClose}
          submit={initial ? "Save changes" : "Add account"}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </RecordDialog>
  );
}
