"use client";

import { useId } from "react";
import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const EMPTY_OPTION_VALUE = "__finora_empty_option__";

export interface FormSelectOption {
  value: string;
  label: string;
}

export function FormSelect({
  label,
  value,
  onValueChange,
  options,
  emptyOption,
  placeholder = "Choose an option",
  error,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FormSelectOption[];
  emptyOption?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const selectValue = value || (emptyOption ? EMPTY_OPTION_VALUE : undefined);

  return (
    <div className={cn("grid min-w-0 gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Select
        value={selectValue}
        onValueChange={(nextValue) =>
          onValueChange(nextValue === EMPTY_OPTION_VALUE ? "" : nextValue)
        }
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-label={label}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="w-full"
        >
          <SelectValue placeholder={emptyOption ?? placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyOption && <SelectItem value={EMPTY_OPTION_VALUE}>{emptyOption}</SelectItem>}
          {options.map((option) => (
            <SelectItem value={option.value} key={option.value}>
              {option.label}
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
