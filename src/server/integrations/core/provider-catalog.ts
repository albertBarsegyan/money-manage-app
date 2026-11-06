import type { ProviderDescriptor } from "./integration.types";

/** No catalog entry below is connectable until an adapter is registered and verified. */
export const providerCatalog: ProviderDescriptor[] = [
  { id: "gocardless-bank-account-data", name: "GoCardless Bank Account Data", category: "BANKING", implementation: "PLANNED", capabilities: ["BALANCES", "TRANSACTIONS", "OAUTH"] },
  { id: "enable-banking", name: "Enable Banking", category: "BANKING", implementation: "PLANNED", capabilities: ["BALANCES", "TRANSACTIONS", "OAUTH"] },
  { id: "plaid", name: "Plaid", category: "BANKING", implementation: "PLANNED", capabilities: ["BALANCES", "TRANSACTIONS", "OAUTH"] },
  { id: "google-wallet", name: "Google Wallet", category: "WALLET", implementation: "UNSUPPORTED", capabilities: [] },
  { id: "csv", name: "Bank statement CSV", category: "CSV", implementation: "IMPLEMENTED_TESTED", capabilities: ["CSV_IMPORT"] },
];
