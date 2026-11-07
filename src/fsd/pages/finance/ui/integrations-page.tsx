import { Icon } from "./finance-page-shared";

export function IntegrationsPage({ onImport }: { onImport: (file?: File) => void }) {
  return (
    <>
      <section className="integration-intro">
        <div className="integration-orbit">
          <span>f</span>
        </div>
        <div>
          <div className="eyebrow">LOCAL DATA INPUTS</div>
          <h2>Keep your records under your control.</h2>
          <p>
            Finora has no active bank or wallet connections in this build. Manual entry works
            offline; CSV rows are reviewed before they affect calculations.
          </p>
        </div>
      </section>
      <div className="integration-section-heading">
        <div>
          <h2>Import and notification sources</h2>
          <p>No source is shown as connected without a real successful setup.</p>
        </div>
      </div>
      <div className="provider-grid">
        <article className="provider-card">
          <div className="provider-card-top">
            <div className="provider-logo blue">⇧</div>
            <span className="provider-status available">Available</span>
          </div>
          <h3>CSV statements</h3>
          <div className="provider-subtitle">User-selected file · local import</div>
          <p>
            Choose a bank statement to preview its supported rows. Imported transactions remain
            pending until you review them.
          </p>
          <label className="secondary-button import-button provider-import">
            <Icon name="download" size={15} /> Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                onImport(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
        </article>
        <ProviderNotice
          name="Bank feeds"
          body="No banking provider has been integrated or connected. Country and institution availability must be verified before offering a connection."
        />
        <ProviderNotice
          name="Android notifications"
          body="NotificationListenerService integration is a future Android feature. No notification access is requested or captured by this web app."
        />
        <ProviderNotice
          name="Google Wallet & Pay"
          body="No general personal transaction-history feed is integrated. Official payment acceptance APIs do not provide a user's full bank transaction history."
        />
      </div>
      <div className="empty-connection">
        <span className="empty-connection-icon">⌁</span>
        <div>
          <b>No connected notification sources</b>
          <p>No financial information is sent to external services by Finora.</p>
        </div>
      </div>
    </>
  );
}

function ProviderNotice({ name, body }: { name: string; body: string }) {
  return (
    <article className="provider-card">
      <div className="provider-card-top">
        <div className="provider-logo violet">⌁</div>
        <span className="provider-status">Planned</span>
      </div>
      <h3>{name}</h3>
      <div className="provider-subtitle">Not connected</div>
      <p>{body}</p>
      <button className="provider-button" disabled>
        Unavailable
      </button>
    </article>
  );
}
