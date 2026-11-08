"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";
import { FinanceProvider } from "@/features/finance-session";
import { Toaster, TooltipProvider } from "@/shared/ui";
import { setNativeSystemBarStyle } from "@/lib/native";
import { PwaSupport } from "./pwa-support";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="finora-theme">
      <PwaSupport />
      <NativeSystemBars />
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

function NativeSystemBars() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme !== "light" && resolvedTheme !== "dark") return;
    void setNativeSystemBarStyle(resolvedTheme).catch((error: unknown) => {
      console.error("Could not update Android system bar appearance.", error);
    });
  }, [resolvedTheme]);

  return null;
}
