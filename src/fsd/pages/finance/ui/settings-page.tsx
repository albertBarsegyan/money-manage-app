import type {
  AccountRecord,
  ExpenseRecord,
  MonitoredCardRecord,
  NotificationReaderSettings,
  SalaryPeriod,
} from "@/entities/finance";
import type { DetectedTransaction } from "@/features/integrations";
import { NotificationReaderPanel } from "@/features/integrations";
import type { StorageMode } from "@/entities/finance";
import { displayDate, Icon } from "./finance-page-shared";

export function SettingsPage({
  mode,
  providers,
  salaryPeriods,
  accounts,
  monitoredCards,
  notificationReader,
  detectedTransactions,
  recentReaderTransactions,
  onMode,
  onClear,
  onSalary,
  onEditSalary,
  onDeleteSalary,
  onReaderSettings,
  onAddMonitoredCard,
  onEditMonitoredCard,
  onDeleteMonitoredCard,
  onReviewDetectedTransaction,
  onDismissDetectedTransaction,
}: {
  mode: StorageMode;
  providers: Array<{
    id: StorageMode;
    capabilities: {
      available: boolean;
      inMemory: boolean;
      persistent: boolean;
      synchronization: boolean;
      importExport: boolean;
    };
  }>;
  salaryPeriods: SalaryPeriod[];
  accounts: AccountRecord[];
  monitoredCards: MonitoredCardRecord[];
  notificationReader: NotificationReaderSettings;
  detectedTransactions: DetectedTransaction[];
  recentReaderTransactions: ExpenseRecord[];
  onMode: (mode: StorageMode) => void;
  onClear: () => void;
  onSalary: () => void;
  onEditSalary: (period: SalaryPeriod) => void;
  onDeleteSalary: (period: SalaryPeriod) => void;
  onReaderSettings: (settings: NotificationReaderSettings) => void;
  onAddMonitoredCard: (card: MonitoredCardRecord) => void;
  onEditMonitoredCard: (card: MonitoredCardRecord) => void;
  onDeleteMonitoredCard: (card: MonitoredCardRecord) => void;
  onReviewDetectedTransaction: (candidate: DetectedTransaction) => void;
  onDismissDetectedTransaction: (candidate: DetectedTransaction) => void;
}) {
  return (
    <div className="settings-stack">
      <NotificationReaderPanel
        settings={notificationReader}
        cards={monitoredCards}
        accounts={accounts}
        recentCandidates={detectedTransactions}
        recentSavedTransactions={recentReaderTransactions}
        onSettings={onReaderSettings}
        onAddCard={onAddMonitoredCard}
        onEditCard={onEditMonitoredCard}
        onDeleteCard={onDeleteMonitoredCard}
        onReviewCandidate={onReviewDetectedTransaction}
        onDismissCandidate={onDismissDetectedTransaction}
      />
      <section className="panel settings-panel">
        <div className="settings-title">
          <span className="settings-icon" aria-hidden="true">
            <Icon name="shield" />
          </span>
          <div>
            <h2>Data &amp; Privacy</h2>
            <p>Storage mode and local data controls</p>
          </div>
        </div>
        <div className="privacy-callout">
          <span className="privacy-dot" />
          <div>
            <b>Local-only · IndexedDB on this device · No cloud storage</b>
            <p>
              Your financial information is stored in this browser on this device using IndexedDB.
              Finora does not upload it or synchronize it to the cloud. Clearing site data or
              uninstalling the app may remove it.
            </p>
          </div>
        </div>
        <div className="setting-subtitle">
          <h3>Storage mode</h3>
          <span>Only implemented modes can be selected.</span>
        </div>
        <div className="storage-options">
          {providers.map((provider) => {
            const names: Record<StorageMode, string> = {
              LOCAL_ONLY: "Local-only",
              PRIVATE_CLOUD: "Private Cloud",
              CUSTOM_DATABASE: "Custom Database",
            };
            const descriptions: Record<StorageMode, string> = {
              LOCAL_ONLY: "Store data in this browser on this device using IndexedDB.",
              PRIVATE_CLOUD:
                "A future user-controlled private cloud, with explicit migration and sync controls.",
              CUSTOM_DATABASE: "A future self-hosted database connection through a secure server.",
            };
            return (
              <button
                key={provider.id}
                className={`storage-option ${mode === provider.id ? "selected" : "planned"}`}
                onClick={() => onMode(provider.id)}
                disabled={!provider.capabilities.available}
                aria-pressed={mode === provider.id}
              >
                <span className="radio-mark" />
                <span className="storage-option-copy">
                  <b>
                    {names[provider.id]}
                    {mode === provider.id && <em>Enabled</em>}
                  </b>
                  <small>{descriptions[provider.id]}</small>
                </span>
                <span
                  className={`provider-status ${provider.capabilities.available ? "available" : ""}`}
                >
                  {provider.capabilities.available ? "Available" : "Planned"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="storage-explainer">
          <b>Changing storage later</b>
          <p>
            Future storage modes will require an explicit data preview and migration confirmation.
            IndexedDB data will not be uploaded automatically.
          </p>
        </div>
      </section>
      <section className="panel settings-panel">
        <div className="settings-title">
          <span className="settings-icon" aria-hidden="true">
            ◷
          </span>
          <div>
            <h2>Salary periods</h2>
            <p>Set the dates used by budget calculations.</p>
          </div>
          <button className="primary-button" onClick={onSalary}>
            <Icon name="plus" size={15} /> Configure period
          </button>
        </div>
        {salaryPeriods.length ? (
          salaryPeriods.map((period) => (
            <div className="salary-setting-row" key={period.id}>
              <div>
                <b>{period.name}</b>
                <span>
                  {displayDate(period.startsOn)} — next salary {displayDate(period.nextSalaryOn)} ·{" "}
                  {period.currency}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Edit ${period.name}`}
                onClick={() => onEditSalary(period)}
              >
                Edit
              </button>
              <button
                type="button"
                aria-label={`Delete ${period.name}`}
                onClick={() => onDeleteSalary(period)}
              >
                Delete
              </button>
            </div>
          ))
        ) : (
          <div className="empty-inline">No salary period configured.</div>
        )}
      </section>
      <section className="panel settings-panel clear-panel">
        <div>
          <h2>Clear local data</h2>
          <p>
            Permanently remove all income, transactions, accounts and salary periods stored by
            Finora on this device.
          </p>
        </div>
        <button className="danger-button" onClick={onClear}>
          <Icon name="trash" size={15} /> Clear Local Data
        </button>
      </section>
      <section className="panel settings-panel">
        <div className="settings-title">
          <span className="settings-icon" aria-hidden="true">
            ⇄
          </span>
          <div>
            <h2>Portability</h2>
            <p>Versioned import/export and cross-provider migration.</p>
          </div>
        </div>
        <div className="future-note">
          Export, import preview, record validation, duplicate detection and migration are planned
          for a future storage release. No automatic backups are created.
        </div>
      </section>
    </div>
  );
}
