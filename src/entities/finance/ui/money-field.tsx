"use client";

import { useId } from "react";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { CURRENCIES } from "../constants";
import type { CurrencyCode } from "../models";

const currencyNames: Record<CurrencyCode, string> = {
  AMD: "AMD",
  USD: "USD",
  EUR: "EUR",
  GBP: "GBP",
};
const currencySymbols: Record<CurrencyCode, string> = {
  AMD: "֏",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function MoneyField({
  label,
  value,
  onChange,
  currency,
  onCurrency,
  error,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  currency: CurrencyCode;
  onCurrency: (value: CurrencyCode) => void;
  error?: string;
  name?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="form-field grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <span
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            {currencySymbols[currency]}
          </span>
          <Input
            id={id}
            name={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="pl-9"
          />
        </div>
        <Select value={currency} onValueChange={(value) => onCurrency(value as CurrencyCode)}>
          <SelectTrigger className="w-24" aria-label={`${label} currency`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((item) => (
              <SelectItem key={item} value={item}>
                {currencyNames[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
