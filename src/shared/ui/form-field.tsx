"use client";

import { useId, type ReactNode } from "react";
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
  const errorId = useId();
  return (
    <div className={cn("form-field grid min-w-0 gap-1.5", className)}>
      <label className="text-sm font-medium text-foreground">
        {label}
        {children}
      </label>
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
