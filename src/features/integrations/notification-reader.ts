import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { CurrencyCode, MonitoredCardRecord } from "@/entities/finance";

export interface DetectedTransaction {
  id: string;
  packageName: string;
  amountMinor: number;
  currency: CurrencyCode;
  merchant: string;
  occurredAt: string;
  type: "EXPENSE" | "INCOME";
  lastFour?: string | null;
  cardId?: string | null;
  reviewStatus: "PENDING_REVIEW";
}

export interface InstalledReaderApp {
  packageName: string;
  name: string;
}

export interface NotificationReaderStatus {
  accessGranted: boolean;
  enabled: boolean;
  selectedPackages: string[];
  notificationsAllowed: boolean;
}

interface NotificationReaderPlugin {
  getStatus(): Promise<NotificationReaderStatus>;
  openAccessSettings(): Promise<void>;
  setMonitoringEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean }>;
  setSelectedPackages(options: { packages: string[] }): Promise<void>;
  setMonitoredCards(options: { cards: MonitoredCardRecord[] }): Promise<void>;
  getInstalledApps(): Promise<{ apps: InstalledReaderApp[] }>;
  getPendingCandidates(): Promise<{ candidates: DetectedTransaction[] }>;
  dismissCandidate(options: { id: string }): Promise<void>;
  clearPendingCandidates(): Promise<void>;
  requestNotificationPermission(): Promise<{ granted: boolean }>;
  addListener(
    eventName: "transactionDetected",
    listener: (candidate: DetectedTransaction) => void,
  ): Promise<PluginListenerHandle>;
}

const nativeReader = registerPlugin<NotificationReaderPlugin>("NotificationReader");

/** Browser builds deliberately have no notification-reading implementation. */
export const notificationReader = {
  isAvailable: () => Capacitor.getPlatform() === "android",
  getStatus: (): Promise<NotificationReaderStatus> =>
    nativeReader.getStatus().catch(() => ({
      accessGranted: false,
      enabled: false,
      selectedPackages: [],
      notificationsAllowed: false,
    })),
  openAccessSettings: () => nativeReader.openAccessSettings(),
  setMonitoringEnabled: (enabled: boolean) => nativeReader.setMonitoringEnabled({ enabled }),
  setSelectedPackages: (packages: string[]) => nativeReader.setSelectedPackages({ packages }),
  setMonitoredCards: (cards: MonitoredCardRecord[]) => nativeReader.setMonitoredCards({ cards }),
  getInstalledApps: () => nativeReader.getInstalledApps(),
  getPendingCandidates: () => nativeReader.getPendingCandidates(),
  dismissCandidate: (id: string) => nativeReader.dismissCandidate({ id }),
  clearPendingCandidates: () => nativeReader.clearPendingCandidates(),
  requestNotificationPermission: () => nativeReader.requestNotificationPermission(),
  addListener: (
    listener: (candidate: DetectedTransaction) => void,
  ): Promise<PluginListenerHandle> => nativeReader.addListener("transactionDetected", listener),
};
