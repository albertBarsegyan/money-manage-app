export default function Loading() {
  return (
    <main className="route-status" aria-busy="true" aria-live="polite">
      <div className="route-status-card">
        <p className="eyebrow">FINORA</p>
        <h1>Loading</h1>
        <p>Preparing your workspace…</p>
      </div>
    </main>
  );
}
