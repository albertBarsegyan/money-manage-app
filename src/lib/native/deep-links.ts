const APP_URL_SCHEME = "com.finora.app:";

const INTERNAL_ROUTES = new Set([
  "/",
  "/transactions",
  "/income",
  "/accounts",
  "/salary-periods",
  "/analytics",
  "/integrations",
  "/settings",
]);

/** Resolve a custom-scheme URL only when it points to a known internal route. */
export function resolveFinoraDeepLink(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== APP_URL_SCHEME ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    )
      return null;

    const segments = [url.hostname, ...url.pathname.split("/").filter(Boolean)].filter(Boolean);
    const path = segments.length ? `/${segments.join("/")}` : "/";
    return INTERNAL_ROUTES.has(path) ? path : null;
  } catch {
    return null;
  }
}
