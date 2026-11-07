"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import { FinanceProvider } from "@/features/finance-session";
import { Toaster, TooltipProvider } from "@/shared/ui";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="finora-theme">
      <MotionConfig reducedMotion="user">
        <FinanceProvider>
          <TooltipProvider>
            {children}
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </FinanceProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
