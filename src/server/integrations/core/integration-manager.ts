import type { ProviderAdapter } from "./integration.types";

/** Registry contains only real adapters. Planned providers are represented in catalog metadata, never as connectable adapters. */
export class IntegrationManager {
  private readonly adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter) {
    if (this.adapters.has(adapter.descriptor.id)) throw new Error(`Provider already registered: ${adapter.descriptor.id}`);
    this.adapters.set(adapter.descriptor.id, adapter);
  }

  get(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) throw new Error(`No implemented adapter for provider: ${providerId}`);
    return adapter;
  }

  listImplemented() { return [...this.adapters.values()].map(adapter => adapter.descriptor); }
}
