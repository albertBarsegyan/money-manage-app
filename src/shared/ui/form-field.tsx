"use client";

import { Children, cloneElement, isValidElement, useId, type ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

export function FormField({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const child = Children.only(children);
  const control = isValidElement<Record<string, unknown>>(child)
    ? (() => {
        const props = child.props;
        const describedBy = [props["aria-describedby"], error ? errorId : undefined]
          .filter((value): value is string => typeof value === "string")
          .join(" ");
        return cloneElement<Record<string, unknown>>(child, {
          id: typeof props.id === "string" ? props.id : id,
          "aria-invalid": error ? true : props["aria-invalid"],
          "aria-describedby": describedBy || undefined,
        });
      })()
    : child;
  return (
    <div className={cn("form-field grid min-w-0 gap-1.5", className)}>
      <label
        htmlFor={
          isValidElement<Record<string, unknown>>(control) && typeof control.props.id === "string"
            ? control.props.id
            : undefined
        }
        className="text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {control}
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
