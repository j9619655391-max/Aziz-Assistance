/**
 * @file /src/domains/discovery/DiscoveryProviderRegistry.ts
 * @description Central Registry for Autonomous Opportunity Discovery Providers.
 * Manages discovery provider lifecycle, capability indexing, prioritized dispatch, and health monitoring.
 */

import { HealthStatus } from "../../kernel/provider/types";
import { IDiscoveryProvider, DiscoveryQuery, OpportunityType } from "./types";

export class DiscoveryProviderRegistry {
  private static instance: DiscoveryProviderRegistry | null = null;
  private providers: Map<string, IDiscoveryProvider> = new Map();
  private enabledMap: Map<string, boolean> = new Map();

  constructor() {
    // Constructor allows standalone instantiation for DI or singleton
    if (!DiscoveryProviderRegistry.instance) {
      DiscoveryProviderRegistry.instance = this;
    }
  }

  public static getInstance(): DiscoveryProviderRegistry {
    if (!DiscoveryProviderRegistry.instance) {
      DiscoveryProviderRegistry.instance = new DiscoveryProviderRegistry();
    }
    return DiscoveryProviderRegistry.instance;
  }

  /**
   * Register an opportunity discovery provider
   */
  public registerProvider(provider: IDiscoveryProvider): void {
    const id = provider.metadata.id;
    this.providers.set(id, provider);
    this.enabledMap.set(id, true);
    console.log(`[DiscoveryProviderRegistry] Registered discovery provider: "${provider.metadata.name}" (${id}) with priority ${provider.metadata.priority}`);
  }

  /**
   * Unregister an opportunity discovery provider
   */
  public unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.enabledMap.delete(id);
    console.log(`[DiscoveryProviderRegistry] Unregistered discovery provider: "${id}"`);
  }

  /**
   * Enable or disable a registered provider
   */
  public setProviderEnabled(id: string, enabled: boolean): void {
    if (this.providers.has(id)) {
      this.enabledMap.set(id, enabled);
      console.log(`[DiscoveryProviderRegistry] Provider "${id}" enabled: ${enabled}`);
    }
  }

  /**
   * Check if a specific provider is currently enabled
   */
  public isProviderEnabled(id: string): boolean {
    return this.enabledMap.get(id) ?? false;
  }

  /**
   * Get a specific provider by ID
   */
  public getProvider(id: string): IDiscoveryProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all registered providers
   */
  public getAllProviders(): IDiscoveryProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get active enabled providers sorted by priority (highest priority first)
   */
  public getActiveProviders(): IDiscoveryProvider[] {
    return this.getAllProviders()
      .filter((p) => this.isProviderEnabled(p.metadata.id))
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * Select candidate providers that match the requirements of a DiscoveryQuery
   */
  public getProvidersForQuery(query: DiscoveryQuery): IDiscoveryProvider[] {
    const active = this.getActiveProviders();
    if (active.length === 0) return [];

    const requestedTypes = query.opportunityTypes;
    if (!requestedTypes || requestedTypes.length === 0) {
      return active;
    }

    return active.filter((provider) => {
      const supported = provider.metadata.capabilities.supportedOpportunityTypes;
      return requestedTypes.some((type: OpportunityType) => supported.includes(type));
    });
  }

  /**
   * Check health statuses of all registered providers
   */
  public async monitorHealth(): Promise<Record<string, HealthStatus>> {
    const statuses: Record<string, HealthStatus> = {};
    for (const [id, provider] of this.providers.entries()) {
      if (!this.isProviderEnabled(id)) {
        statuses[id] = "offline";
      } else {
        try {
          statuses[id] = await provider.getHealth();
        } catch {
          statuses[id] = "offline";
        }
      }
    }
    return statuses;
  }

  /**
   * Reset the registry (useful for clean test runs)
   */
  public reset(): void {
    this.providers.clear();
    this.enabledMap.clear();
  }
}
