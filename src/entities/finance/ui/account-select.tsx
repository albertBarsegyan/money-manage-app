"use client";

import { useId } from "react";
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
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="form-field grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue === "none" ? "" : nextValue)}
      >
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        >
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
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
