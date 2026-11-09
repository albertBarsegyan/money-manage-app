"use client";

import { Suspense } from "react";
import { FinanceWorkspace, type View } from "@/fsd/pages/finance";

/** Client finance shell shared by every App Router page (needs search-params Suspense). */
export function FinanceRoute({ view }: { view?: View } = {}) {
  return (
    <Suspense fallback={null}>
      <FinanceWorkspace view={view} />
    </Suspense>
  );
}
