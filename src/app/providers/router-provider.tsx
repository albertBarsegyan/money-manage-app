"use client";

import { Suspense } from "react";
import { FinanceWorkspace } from "@/fsd/pages/finance";

export function AppRouterProvider() {
  return (
    <Suspense fallback={null}>
      <FinanceWorkspace />
    </Suspense>
  );
}
