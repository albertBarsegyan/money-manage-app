"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { parseMoney, RECURRENCES, type Recurrence, type SalaryPeriod } from "@/entities/finance";
import { MoneyField } from "@/entities/finance";
import { FormActions, FormField, FormSelect, Input, RecordDialog } from "@/shared/ui";
import { getLocalDate } from "@/shared/lib/date";
import { salaryPeriodSchema, type SalaryPeriodFormValues } from "../model/schema";

const recurrenceOptions = RECURRENCES.map(({ value, label }) => ({ value, label }));

export function SalaryPeriodFormDialog({
  initial,
  onClose,
  onSave,
}: {
  initial?: SalaryPeriod;
  onClose: () => void;
  onSave: (record: SalaryPeriod) => void;
}) {
  const form = useForm<SalaryPeriodFormValues>({
    resolver: zodResolver(salaryPeriodSchema),
    defaultValues: {
      name: initial?.name ?? "",
      currency: initial?.currency ?? "AMD",
      startsOn: initial?.startsOn ?? getLocalDate(),
      nextSalaryOn: initial?.nextSalaryOn ?? "",
      salary: initial?.expectedSalaryMinor ? (initial.expectedSalaryMinor / 100).toFixed(2) : "",
      recurrence: initial?.recurrence ?? "MONTHLY",
    },
  });
  const [salary, currency, recurrence] = useWatch({
    control: form.control,
    name: ["salary", "currency", "recurrence"],
  });

  const submit = form.handleSubmit((values) => {
    const expectedSalaryMinor = values.salary
      ? parseMoney(values.salary, values.currency) || undefined
      : undefined;
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: values.name.trim(),
      currency: values.currency,
      startsOn: values.startsOn,
      nextSalaryOn: values.nextSalaryOn,
      expectedSalaryMinor,
      recurrence: values.recurrence as Recurrence,
    });
  });

  return (
    <RecordDialog
      title={initial ? "Edit salary period" : "Configure salary period"}
      description="BUDGET CALENDAR"
      onClose={onClose}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <FormField label="Period name" error={form.formState.errors.name?.message}>
          <Input
            autoFocus
            placeholder="Monthly salary period"
            {...form.register("name")}
            aria-invalid={Boolean(form.formState.errors.name)}
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Starts on" error={form.formState.errors.startsOn?.message}>
            <Input
              type="date"
              {...form.register("startsOn")}
              aria-invalid={Boolean(form.formState.errors.startsOn)}
            />
          </FormField>
          <FormField label="Next salary date" error={form.formState.errors.nextSalaryOn?.message}>
            <Input
              type="date"
              {...form.register("nextSalaryOn")}
              aria-invalid={Boolean(form.formState.errors.nextSalaryOn)}
            />
          </FormField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField
            label="Expected salary (optional)"
            value={salary}
            onChange={(value) =>
              form.setValue("salary", value, { shouldDirty: true, shouldValidate: true })
            }
            currency={currency}
            onCurrency={(value) =>
              form.setValue("currency", value, { shouldDirty: true, shouldValidate: true })
            }
            error={form.formState.errors.salary?.message}
            name="salary"
          />
          <FormSelect
            label="Recurrence"
            value={recurrence}
            options={recurrenceOptions}
            onValueChange={(value) =>
              form.setValue("recurrence", value as Recurrence, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        </div>
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Expected salary is a planning value. It does not count as received income.
        </p>
        <FormActions
          onCancel={onClose}
          submit={initial ? "Save period" : "Configure period"}
          isSubmitting={form.formState.isSubmitting}
        />
      </form>
    </RecordDialog>
  );
}
