import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-status">
      <div className="route-status-card">
        <p className="eyebrow">FINORA</p>
        <h1>Page not found</h1>
        <p>This Finora page does not exist.</p>
        <Link className="primary-button" href="/">
          Back to overview
        </Link>
      </div>
    </main>
  );
}
