"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="route-status" role="alert">
      <div className="route-status-card">
        <p className="eyebrow">FINORA</p>
        <h1>This page could not be opened</h1>
        <p>{error.message || "An unexpected route error occurred."}</p>
        <button className="primary-button" onClick={reset} type="button">
          Try again
        </button>
      </div>
    </main>
  );
}
