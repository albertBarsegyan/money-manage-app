"use client";

import { FormField } from "@/shared/ui/form-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { AccountRecord } from "../models";

export function AccountSelect({
  label,
  value,
  onChange,
  accounts,
  optional = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accounts: AccountRecord[];
  optional?: boolean;
  error?: string;
}) {
  return (
    <FormField label={label} error={error}>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue === "none" ? "" : nextValue)}
      >
        <SelectTrigger className="w-full" aria-invalid={Boolean(error)}>
          <SelectValue placeholder={optional ? "No account" : "Choose account"} />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value="none">No account</SelectItem>}
          {accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
