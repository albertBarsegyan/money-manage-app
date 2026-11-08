import { AppRouterProvider } from "@/app/providers/router-provider";

const APP_PATHS = [
  "transactions",
  "income",
  "accounts",
  "salary-periods",
  "analytics",
  "integrations",
  "settings",
];

export function generateStaticParams() {
  return [{ path: [] }, ...APP_PATHS.map((path) => ({ path: [path] }))];
}

export default function RouterHostPage() {
  return <AppRouterProvider />;
}
