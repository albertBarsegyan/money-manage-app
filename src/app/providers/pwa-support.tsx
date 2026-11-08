"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { useOffline } from "next/offline";

const INSTALL_DISMISSED_KEY = "finora-pwa-install-dismissed";

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
  const [installDismissed, setInstallDismissed] = useState(false);
  const isOffline = useOffline();
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean(navigator.standalone));
    setInstalled(standalone);
    setInstallDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === "true");

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (localStorage.getItem(INSTALL_DISMISSED_KEY) !== "true")
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
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  };

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setInstallDismissed(true);
    setInstallPrompt(null);
  };

  if ((!installPrompt || installed || installDismissed) && !isOffline) return null;
  return (
    <div className="pwa-controls">
      {isOffline && (
        <span className="pwa-offline-indicator" role="status">
          <WifiOff size={14} aria-hidden="true" /> Offline
        </span>
      )}
      {installPrompt && !installed && !installDismissed && (
        <section className="pwa-install-popover" aria-label="Install Finora">
          <div className="pwa-install-copy">
            <b>Install this app</b>
            <span>Open Finora from your home screen.</span>
          </div>
          <button
            type="button"
            className="pwa-install-button"
            onClick={() => void install().catch(() => setInstallPrompt(null))}
          >
            <Download size={14} aria-hidden="true" />
            Install
          </button>
          <button
            type="button"
            className="pwa-install-dismiss"
            aria-label="Dismiss install offer"
            title="Dismiss"
            onClick={dismissInstall}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </section>
      )}
    </div>
  );
}
