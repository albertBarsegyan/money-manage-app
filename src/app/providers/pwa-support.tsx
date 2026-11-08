"use client";

import { useEffect } from "react";
import { isNativePlatform } from "@/lib/native";

export function PwaSupport() {
  useEffect(() => {
    if (isNativePlatform()) return;

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    }
  }, []);
  return null;
}
