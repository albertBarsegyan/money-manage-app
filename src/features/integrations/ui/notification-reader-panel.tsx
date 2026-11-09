"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import type {
  AccountRecord,
  CurrencyCode,
  ExpenseRecord,
  MonitoredCardRecord,
  MonitoredCardType,
  NotificationReaderSettings,
} from "@/entities/finance";
import { CURRENCIES } from "@/entities/finance";
import { FormActions, FormField, FormSelect, Input, RecordDialog } from "@/shared/ui";
import {
  notificationReader,
  type DetectedTransaction,
  type InstalledReaderApp,
  type NotificationReaderStatus,
} from "../notification-reader";

const cardTypes: Array<{ value: MonitoredCardType; label: string }> = [
  { value: "DEBIT", label: "Debit card" },
  { value: "CREDIT", label: "Credit card" },
  { value: "PREPAID", label: "Prepaid card" },
  { value: "ACCOUNT", label: "Bank account" },
];
const currencyOptions = CURRENCIES.map((currency) => ({ value: currency, label: currency }));

export function NotificationReaderPanel({
  settings,
  cards,
  accounts,
  recentCandidates,
  recentSavedTransactions,
  onSettings,
  onAddCard,
  onEditCard,
  onDeleteCard,
  onReviewCandidate,
  onDismissCandidate,
}: {
  settings: NotificationReaderSettings;
  cards: MonitoredCardRecord[];
  accounts: AccountRecord[];
  recentCandidates: DetectedTransaction[];
  recentSavedTransactions: ExpenseRecord[];
  onSettings: (next: NotificationReaderSettings) => void;
  onAddCard: (card: MonitoredCardRecord) => void;
  onEditCard: (card: MonitoredCardRecord) => void;
  onDeleteCard: (card: MonitoredCardRecord) => void;
  onReviewCandidate: (candidate: DetectedTransaction) => void;
  onDismissCandidate: (candidate: DetectedTransaction) => void;
}) {
  const [status, setStatus] = useState<NotificationReaderStatus>({
    accessGranted: false,
    enabled: false,
    selectedPackages: [],
    notificationsAllowed: false,
  });
  const [apps, setApps] = useState<InstalledReaderApp[]>([]);
  const [cardDialog, setCardDialog] = useState(false);
  const [editingCard, setEditingCard] = useState<MonitoredCardRecord>();
  const [error, setError] = useState("");
  const nativeAvailable = notificationReader.isAvailable();

  useEffect(() => {
    if (!nativeAvailable) return;
    let active = true;
    const refresh = async () => {
      const [readerStatus, installed] = await Promise.all([
        notificationReader.getStatus(),
        notificationReader.getInstalledApps().catch(() => ({ apps: [] })),
      ]);
      if (!active) return;
      setStatus(readerStatus);
      setApps(installed.apps);
    };
    void refresh();
    let alive = true;
    let stateListener: { remove: () => Promise<void> } | undefined;
    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) return;
      void notificationReader.getStatus().then((next) => {
        if (alive) setStatus(next);
      });
    }).then((handle) => {
      if (alive) stateListener = handle;
      else void handle.remove();
    });
    return () => {
      alive = false;
      void stateListener?.remove();
      active = false;
    };
  }, [nativeAvailable]);

  const updateSettings = (patch: Partial<NotificationReaderSettings>) => {
    onSettings({ ...settings, ...patch });
  };
  const requestAccess = async () => {
    setError("");
    try {
      await notificationReader.openAccessSettings();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not open Android notification settings.",
      );
    }
  };
  const requestAlerts = async () => {
    try {
      const result = await notificationReader.requestNotificationPermission();
      setStatus((current) => ({ ...current, notificationsAllowed: result.granted }));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not request notification permission.",
      );
    }
  };
  const togglePackage = (packageName: string) => {
    const selectedPackages = settings.selectedPackages.includes(packageName)
      ? settings.selectedPackages.filter((item) => item !== packageName)
      : [...settings.selectedPackages, packageName];
    updateSettings({ selectedPackages });
  };

  return (
    <section className="panel settings-panel reader-panel">
      <div className="settings-title">
        <span className="settings-icon" aria-hidden="true">
          ◉
        </span>
        <div>
          <h2>Notification Reader</h2>
          <p>Review transaction alerts locally before they enter your records.</p>
        </div>
        <label className="reader-enable">
          <input
            type="checkbox"
            checked={settings.enabled}
            disabled={!nativeAvailable}
            onChange={(event) => {
              updateSettings({ enabled: event.currentTarget.checked });
              if (event.currentTarget.checked && !status.accessGranted) void requestAccess();
            }}
          />
          <span>{settings.enabled ? "Enabled" : "Disabled"}</span>
        </label>
      </div>

      {!nativeAvailable ? (
        <div className="reader-callout">
          Notification reading is available in the Android app. Browser and PWA builds do not read
          notifications.
        </div>
      ) : (
        <>
          <div className={`reader-access ${status.accessGranted ? "granted" : "needed"}`}>
            <div>
              <b>Notification access: {status.accessGranted ? "Allowed" : "Not allowed"}</b>
              <p>
                Android manages this sensitive access. Finora processes selected app notifications
                on this device.
              </p>
            </div>
            {!status.accessGranted && (
              <button className="secondary-button" onClick={() => void requestAccess()}>
                Open Android settings
              </button>
            )}
          </div>
          {settings.enabled && !status.notificationsAllowed && (
            <div className="reader-alert-permission">
              <span>Background review alerts need Android notification permission.</span>
              <button className="secondary-button" onClick={() => void requestAlerts()}>
                Allow alerts
              </button>
            </div>
          )}

          <div className="reader-section">
            <div className="reader-section-heading">
              <div>
                <h3>Applications to monitor</h3>
                <p>Select Wallet or banking apps installed on this device.</p>
              </div>
              <span>{settings.selectedPackages.length} selected</span>
            </div>
            {apps.length ? (
              <div className="reader-app-list">
                {apps.map((app) => (
                  <label className="reader-app-row" key={app.packageName}>
                    <input
                      type="checkbox"
                      checked={settings.selectedPackages.includes(app.packageName)}
                      onChange={() => togglePackage(app.packageName)}
                    />
                    <span>
                      <b>{app.name}</b>
                      <small>{app.packageName}</small>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="reader-empty">No launchable apps were found.</p>
            )}
          </div>

          <div className="reader-section">
            <div className="reader-section-heading">
              <div>
                <h3>Monitored cards and accounts</h3>
                <p>Only card name, bank, currency, and optional last four digits are stored.</p>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setEditingCard(undefined);
                  setCardDialog(true);
                }}
              >
                Add card or account
              </button>
            </div>
            {cards.length ? (
              cards.map((card) => (
                <div className="reader-card-row" key={card.id}>
                  <div className="reader-card-mark" aria-hidden="true">
                    ▤
                  </div>
                  <div className="reader-card-copy">
                    <b>
                      {card.name} {card.lastFour ? `···· ${card.lastFour}` : ""}
                    </b>
                    <span>
                      {card.bankName || "Bank not specified"} ·{" "}
                      {cardTypes.find((type) => type.value === card.type)?.label} · {card.currency}
                    </span>
                    {card.accountId && (
                      <small>
                        Linked to{" "}
                        {accounts.find((item) => item.id === card.accountId)?.name ?? "account"}
                      </small>
                    )}
                  </div>
                  <label className="reader-card-monitor">
                    <input
                      type="checkbox"
                      checked={card.monitoringEnabled}
                      onChange={() =>
                        onEditCard({ ...card, monitoringEnabled: !card.monitoringEnabled })
                      }
                    />
                    <span>Monitor</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCard(card);
                      setCardDialog(true);
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteCard(card)}>
                    Delete
                  </button>
                </div>
              ))
            ) : (
              <p className="reader-empty">
                Add a card to match alerts to an account. Monitoring can be enabled per card.
              </p>
            )}
          </div>

          <div className="reader-section">
            <div className="reader-section-heading">
              <div>
                <h3>Recent detected transactions</h3>
                <p>Each item stays pending until you confirm it or dismiss it.</p>
              </div>
            </div>
            {recentCandidates.length
              ? recentCandidates.map((candidate) => (
                  <div className="reader-candidate-row" key={candidate.id}>
                    <div>
                      <b>{candidate.merchant}</b>
                      <span>
                        {candidate.type === "INCOME" ? "Income" : "Expense"} ·{" "}
                        {new Date(candidate.occurredAt).toLocaleString()}
                      </span>
                    </div>
                    <strong>
                      {(candidate.amountMinor / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {candidate.currency}
                    </strong>
                    <button className="primary-button" onClick={() => onReviewCandidate(candidate)}>
                      Review
                    </button>
                    <button type="button" onClick={() => onDismissCandidate(candidate)}>
                      Dismiss
                    </button>
                  </div>
                ))
              : null}
            {recentSavedTransactions.map((transaction) => (
              <div className="reader-candidate-row" key={transaction.id}>
                <div>
                  <b>{transaction.description}</b>
                  <span>Confirmed · {new Date(transaction.occurredAt).toLocaleString()}</span>
                </div>
                <strong>
                  {(transaction.amountMinor / 100).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  {transaction.currency}
                </strong>
                <span className="reader-confirmed-tag">Saved</span>
              </div>
            ))}
            {!recentCandidates.length && !recentSavedTransactions.length && (
              <p className="reader-empty">No transaction notifications have been detected yet.</p>
            )}
          </div>

          <div className="reader-callout">
            <b>Permission and privacy</b>
            <p>
              Enable access in Android settings, then choose apps above. Android may stop the
              listener if access is revoked. Notification text is parsed on-device and is not sent
              to a server. Finora does not ask for full card numbers, security codes, PINs, or
              banking credentials.
            </p>
          </div>
        </>
      )}
      {error && (
        <p className="reader-error" role="alert">
          {error}
        </p>
      )}
      {cardDialog && (
        <MonitoredCardDialog
          initial={editingCard}
          accounts={accounts}
          onClose={() => setCardDialog(false)}
          onSave={(card) => {
            setCardDialog(false);
            if (editingCard) onEditCard(card);
            else onAddCard(card);
          }}
        />
      )}
    </section>
  );
}

function MonitoredCardDialog({
  initial,
  accounts,
  onClose,
  onSave,
}: {
  initial?: MonitoredCardRecord;
  accounts: AccountRecord[];
  onClose: () => void;
  onSave: (card: MonitoredCardRecord) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [bankName, setBankName] = useState(initial?.bankName ?? "");
  const [type, setType] = useState<MonitoredCardType>(initial?.type ?? "DEBIT");
  const [lastFour, setLastFour] = useState(initial?.lastFour ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? "AMD");
  const [accountId, setAccountId] = useState(initial?.accountId ?? "");
  const [monitoringEnabled, setMonitoringEnabled] = useState(initial?.monitoringEnabled ?? true);
  const [error, setError] = useState("");
  const matchingAccounts = accounts.filter((account) => account.currency === currency);
  const save = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter a card or account name.");
      return;
    }
    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      setError("Enter only the last four digits.");
      return;
    }
    if (accountId && !matchingAccounts.some((account) => account.id === accountId)) {
      setError("Choose an account with the same currency.");
      return;
    }
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      bankName: bankName.trim(),
      type,
      lastFour: lastFour || undefined,
      currency,
      accountId: accountId || undefined,
      monitoringEnabled,
    });
  };
  return (
    <RecordDialog
      title={initial ? "Edit monitored card" : "Add a card or account"}
      description="NOTIFICATION READER"
      onClose={onClose}
    >
      <form onSubmit={save} className="grid gap-4" noValidate>
        <FormField label="Card or account name">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Everyday debit"
          />
        </FormField>
        <FormField label="Bank name">
          <Input
            value={bankName}
            onChange={(event) => setBankName(event.target.value)}
            placeholder="Bank or wallet name"
          />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormSelect
            label="Card type"
            value={type}
            options={cardTypes}
            onValueChange={(value) => setType(value as MonitoredCardType)}
          />
          <FormSelect
            label="Currency"
            value={currency}
            options={currencyOptions}
            onValueChange={(value) => {
              setCurrency(value as CurrencyCode);
              setAccountId("");
            }}
          />
        </div>
        <FormField label="Last four digits (optional)">
          <Input
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={lastFour}
            onChange={(event) => setLastFour(event.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="1234"
          />
        </FormField>
        <FormSelect
          label="Link to account (optional)"
          value={accountId}
          options={matchingAccounts.map((account) => ({ value: account.id, label: account.name }))}
          emptyOption="No linked account"
          onValueChange={setAccountId}
        />
        <label className="reader-dialog-check">
          <input
            type="checkbox"
            checked={monitoringEnabled}
            onChange={(event) => setMonitoringEnabled(event.currentTarget.checked)}
          />
          <span>Match notifications to this card</span>
        </label>
        <p className="text-xs text-muted-foreground">
          Finora never requests or stores a full card number, CVV, PIN, or bank login.
        </p>
        {error && (
          <p className="reader-error" role="alert">
            {error}
          </p>
        )}
        <FormActions onCancel={onClose} submit={initial ? "Save changes" : "Add card"} />
      </form>
    </RecordDialog>
  );
}
