import { IDataProvider, ProviderMetadata, HealthStatus, ProviderDiagnostics, ResponseProvenance } from "./types";
import { Job, FreelanceGig } from "../../types";

export class ProviderManager {
  private static instance: ProviderManager | null = null;
  private providers: Map<string, IDataProvider> = new Map();
  private enabledStates: Map<string, boolean> = new Map();

  // Global telemetry
  private telemetry = {
    totalJobFetches: 0,
    totalGigFetches: 0,
    failoverCount: 0,
    activeProviderId: "google-search-grounding",
  };

  private constructor() {
    // Private constructor for Singleton pattern
  }

  public static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  /**
   * Register a new data provider (Plugin architecture)
   */
  public registerProvider(provider: IDataProvider): void {
    const id = provider.metadata.id;
    this.providers.set(id, provider);
    this.enabledStates.set(id, true); // Enabled by default
    console.log(`[ProviderManager] Registered provider: "${provider.metadata.name}" (${id}) with priority ${provider.metadata.priority}`);
  }

  /**
   * Enable/disable a specific provider
   */
  public setProviderEnabled(id: string, enabled: boolean): void {
    if (this.providers.has(id)) {
      this.enabledStates.set(id, enabled);
      console.log(`[ProviderManager] Provider "${id}" enabled state changed to: ${enabled}`);
    }
  }

  /**
   * Check if a provider is enabled
   */
  public isProviderEnabled(id: string): boolean {
    return this.enabledStates.get(id) ?? false;
  }

  /**
   * Unregister a provider
   */
  public unregisterProvider(id: string): void {
    this.providers.delete(id);
    this.enabledStates.delete(id);
    console.log(`[ProviderManager] Unregistered provider: "${id}"`);
  }

  /**
   * Retrieve all registered providers
   */
  public getAllProviders(): IDataProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Retrieve a list of active (enabled) providers sorted by priority descending
   */
  public getActiveProvidersSorted(): IDataProvider[] {
    return this.getAllProviders()
      .filter((provider) => this.isProviderEnabled(provider.metadata.id))
      .sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * Health Monitor: Get health statuses for all registered providers
   */
  public async monitorHealth(): Promise<Record<string, HealthStatus>> {
    const statuses: Record<string, HealthStatus> = {};
    for (const [id, provider] of this.providers.entries()) {
      if (!this.isProviderEnabled(id)) {
        statuses[id] = "offline";
      } else {
        try {
          statuses[id] = await provider.getHealth();
        } catch (err) {
          statuses[id] = "offline";
        }
      }
    }
    return statuses;
  }

  /**
   * Capability Matrix Query: Filter providers that support a specific capability
   */
  public getProvidersWithCapabilities(filter: (matrix: IDataProvider["metadata"]["capabilities"]) => boolean): IDataProvider[] {
    return this.getAllProviders().filter((provider) => filter(provider.metadata.capabilities));
  }

  /**
   * Get overall manager state & telemetry
   */
  public getTelemetry() {
    return {
      ...this.telemetry,
      registeredCount: this.providers.size,
      enabledCount: Array.from(this.enabledStates.values()).filter(Boolean).length,
    };
  }

  /**
   * Priority-based failover job fetching:
   * Will iterate through enabled providers in order of priority.
   * If one fails or is offline, it automatically logs telemetry and fails over to the next.
   */
  public async fetchJobsWithFailover(
    query: string,
    skills: string[],
    preferredCountries: string[],
    visaPreference: string,
    options?: { page?: number; limit?: number; requestId?: string }
  ): Promise<{ jobs: Job[]; provenance: ResponseProvenance }> {
    this.telemetry.totalJobFetches++;
    const candidates = this.getActiveProvidersSorted();
    const requestId = options?.requestId || `req-job-failover-${Date.now()}`;
    const startTime = Date.now();

    if (candidates.length === 0) {
      throw new Error("No active providers registered in the Provider Layer.");
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const providerId = provider.metadata.id;

      try {
        const health = await provider.getHealth();
        if (health === "offline") {
          console.warn(`[ProviderManager] Skipping offline provider "${provider.metadata.name}"`);
          continue;
        }

        console.log(`[ProviderManager] Attempting fetchJobs from priority provider: "${provider.metadata.name}"`);
        const result = await provider.fetchJobs(query, skills, preferredCountries, visaPreference, { ...options, requestId });
        
        this.telemetry.activeProviderId = providerId;
        
        // Enrich provenance with retry info
        result.provenance.retryCount = retryCount;
        return result;
      } catch (err: any) {
        console.error(`[ProviderManager] Provider "${provider.metadata.name}" failed:`, err);
        lastError = err;
        retryCount++;
        this.telemetry.failoverCount++;
      }
    }

    // Ultimate fallback if ALL providers failed completely and no cache was found
    const durationMs = Date.now() - startTime;
    const fallbackProvenance: ResponseProvenance = {
      origin: "UNAVAILABLE",
      providerId: "provider-manager",
      providerName: "Multi-Provider Orchestrator",
      providerVersion: "1.2.0",
      durationMs,
      requestId,
      cacheUsed: false,
      retryCount,
      healthStatus: "offline",
      finalStatus: `All registered providers failed to retrieve any data. Last failure: ${lastError?.message || "Unknown error"}`
    };

    return {
      jobs: [],
      provenance: fallbackProvenance
    };
  }

  /**
   * Priority-based failover freelance gig fetching:
   * Will iterate through enabled providers in order of priority.
   * If one fails or is offline, it automatically logs telemetry and fails over to the next.
   */
  public async fetchGigsWithFailover(
    query: string,
    skills: string[],
    options?: { page?: number; limit?: number; requestId?: string }
  ): Promise<{ gigs: FreelanceGig[]; provenance: ResponseProvenance }> {
    this.telemetry.totalGigFetches++;
    const candidates = this.getActiveProvidersSorted();
    const requestId = options?.requestId || `req-gig-failover-${Date.now()}`;
    const startTime = Date.now();

    if (candidates.length === 0) {
      throw new Error("No active providers registered in the Provider Layer.");
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let i = 0; i < candidates.length; i++) {
      const provider = candidates[i];
      const providerId = provider.metadata.id;

      try {
        const health = await provider.getHealth();
        if (health === "offline") {
          console.warn(`[ProviderManager] Skipping offline provider "${provider.metadata.name}"`);
          continue;
        }

        console.log(`[ProviderManager] Attempting fetchGigs from priority provider: "${provider.metadata.name}"`);
        const result = await provider.fetchGigs(query, skills, { ...options, requestId });
        
        this.telemetry.activeProviderId = providerId;
        
        // Enrich provenance with retry info
        result.provenance.retryCount = retryCount;
        return result;
      } catch (err: any) {
        console.error(`[ProviderManager] Provider "${provider.metadata.name}" failed:`, err);
        lastError = err;
        retryCount++;
        this.telemetry.failoverCount++;
      }
    }

    // Ultimate fallback if ALL providers failed completely and no cache was found
    const durationMs = Date.now() - startTime;
    const fallbackProvenance: ResponseProvenance = {
      origin: "UNAVAILABLE",
      providerId: "provider-manager",
      providerName: "Multi-Provider Orchestrator",
      providerVersion: "1.2.0",
      durationMs,
      requestId,
      cacheUsed: false,
      retryCount,
      healthStatus: "offline",
      finalStatus: `All registered providers failed to retrieve any freelance data. Last failure: ${lastError?.message || "Unknown error"}`
    };

    return {
      gigs: [],
      provenance: fallbackProvenance
    };
  }
}
