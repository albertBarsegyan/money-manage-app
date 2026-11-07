"use client";

import { DollarSign } from "lucide-react";
import { FormField } from "@/shared/ui/form-field";
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
  return (
    <FormField label={label} error={error}>
      <div className="flex min-w-0 gap-2">
        <div className="relative min-w-0 flex-1">
          <DollarSign
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id={name}
            name={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={Boolean(error)}
            className="pl-9"
          />
        </div>
        <Select value={currency} onValueChange={(value) => onCurrency(value as CurrencyCode)}>
          <SelectTrigger className="w-24" aria-label="Currency">
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
    </FormField>
  );
}
