import {
  createRootRoute,
  Link,
  useRouterState,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { FinanceWorkspace, type View } from "@/fsd/pages/finance";

function viewForPath(pathname: string): View {
  switch (pathname) {
    case "/transactions":
      return "Transactions";
    case "/income":
      return "Income";
    case "/accounts":
      return "Accounts";
    case "/analytics":
      return "Analytics";
    case "/integrations":
      return "Integrations";
    case "/settings":
      return "Settings";
    default:
      return "Overview";
  }
}

function RootRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return <FinanceWorkspace view={viewForPath(pathname)} />;
}

function RouteError({ error, reset }: ErrorComponentProps) {
  return (
    <main className="route-status" role="alert">
      <div className="route-status-card">
        <p className="eyebrow">FINORA</p>
        <h1>This page could not be opened</h1>
        <p>{error instanceof Error ? error.message : "An unexpected route error occurred."}</p>
        <button className="primary-button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main className="route-status">
      <div className="route-status-card">
        <p className="eyebrow">FINORA</p>
        <h1>Page not found</h1>
        <p>This Finora page does not exist.</p>
        <Link className="primary-button" to="/">
          Back to overview
        </Link>
      </div>
    </main>
  );
}

export const Route = createRootRoute({
  component: RootRoute,
  errorComponent: RouteError,
  notFoundComponent: NotFound,
});
