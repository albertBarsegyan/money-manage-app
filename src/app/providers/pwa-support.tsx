"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff } from "lucide-react";
import { useOffline } from "next/offline";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaSupport() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    }
  }, []);
  return null;
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const isOffline = useOffline();
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean(navigator.standalone));
    setInstalled(standalone);

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if ((!installPrompt || installed) && !isOffline) return null;
  return (
    <div className="pwa-controls">
      {isOffline && (
        <span className="pwa-offline-indicator" role="status">
          <WifiOff size={14} aria-hidden="true" /> Offline
        </span>
      )}
      {installPrompt && !installed && (
        <button
          type="button"
          className="pwa-install-button"
          onClick={() => void install().catch(() => setInstallPrompt(null))}
        >
          <Download size={15} aria-hidden="true" />
          Install app
        </button>
      )}
    </div>
  );
}
