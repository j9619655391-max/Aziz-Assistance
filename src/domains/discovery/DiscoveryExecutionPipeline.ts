/**
 * @file /src/domains/discovery/DiscoveryExecutionPipeline.ts
 * @description Execution Pipeline for Autonomous Opportunity Discovery.
 * Coordinates multi-provider execution, timeout handling, error resilience, result normalization,
 * and unified deduplication.
 */

import { DiscoveryProviderRegistry } from "./DiscoveryProviderRegistry";
import { 
  DiscoveryQuery, 
  DiscoveryExecutionOptions, 
  DiscoveryExecutionResult, 
  DiscoveredOpportunity, 
  ProviderExecutionStats 
} from "./types";
import { deduplicateOpportunities } from "./utils";
import { ResponseProvenance } from "../../kernel/provider/types";

export class DiscoveryExecutionPipeline {
  private registry: DiscoveryProviderRegistry;

  constructor(registry?: DiscoveryProviderRegistry) {
    this.registry = registry || DiscoveryProviderRegistry.getInstance();
  }

  /**
   * Execute discovery query through registered providers with full resilience and deduplication
   */
  public async execute(
    query: DiscoveryQuery, 
    options?: DiscoveryExecutionOptions
  ): Promise<DiscoveryExecutionResult> {
    const startTime = Date.now();
    const executionId = `exec-disc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timeoutMs = options?.timeoutMs || 15000;
    const deduplicate = options?.deduplicate ?? true;
    const minConfidence = options?.minConfidenceThreshold ?? 0;

    // 1. Select candidate providers
    let candidates = this.registry.getProvidersForQuery(query);

    // If explicit providers are requested, filter by them
    if (options?.providers && options.providers.length > 0) {
      const allowed = new Set(options.providers);
      candidates = candidates.filter(p => allowed.has(p.metadata.id));
    }

    const providerStats: Record<string, ProviderExecutionStats> = {};
    const provenanceChain: ResponseProvenance[] = [];
    let rawOpportunities: DiscoveredOpportunity[] = [];

    if (candidates.length === 0) {
      console.warn(`[DiscoveryPipeline] No eligible discovery providers found for query:`, query);
      return {
        executionId,
        query,
        opportunities: [],
        totalDiscovered: 0,
        deduplicatedCount: 0,
        providerStats: {},
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        provenanceChain: []
      };
    }

    // 2. Execute providers
    if (options?.enableFailover) {
      // Priority-based failover execution
      for (const provider of candidates) {
        const pId = provider.metadata.id;
        const pStart = Date.now();
        try {
          const health = await provider.getHealth();
          if (health === "offline") {
            providerStats[pId] = {
              providerId: pId,
              providerName: provider.metadata.name,
              durationMs: Date.now() - pStart,
              count: 0,
              status: "SKIPPED",
              error: "Provider offline"
            };
            continue;
          }

          const result = await this.executeWithTimeout(
            provider.discover(query, options),
            timeoutMs
          );

          providerStats[pId] = {
            providerId: pId,
            providerName: provider.metadata.name,
            durationMs: Date.now() - pStart,
            count: result.opportunities.length,
            status: "SUCCESS"
          };
          provenanceChain.push(result.provenance);
          rawOpportunities.push(...result.opportunities);

          if (result.opportunities.length > 0) {
            // First successful provider satisfied failover
            break;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          providerStats[pId] = {
            providerId: pId,
            providerName: provider.metadata.name,
            durationMs: Date.now() - pStart,
            count: 0,
            status: "FAILED",
            error: errMsg
          };
        }
      }
    } else {
      // Multi-provider parallel dispatch
      const executionPromises = candidates.map(async (provider) => {
        const pId = provider.metadata.id;
        const pStart = Date.now();
        try {
          const health = await provider.getHealth();
          if (health === "offline") {
            providerStats[pId] = {
              providerId: pId,
              providerName: provider.metadata.name,
              durationMs: Date.now() - pStart,
              count: 0,
              status: "SKIPPED",
              error: "Provider offline"
            };
            return [];
          }

          const result = await this.executeWithTimeout(
            provider.discover(query, options),
            timeoutMs
          );

          providerStats[pId] = {
            providerId: pId,
            providerName: provider.metadata.name,
            durationMs: Date.now() - pStart,
            count: result.opportunities.length,
            status: result.provenance.origin === "DEGRADED" ? "DEGRADED" : "SUCCESS"
          };
          provenanceChain.push(result.provenance);
          return result.opportunities;
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          providerStats[pId] = {
            providerId: pId,
            providerName: provider.metadata.name,
            durationMs: Date.now() - pStart,
            count: 0,
            status: "FAILED",
            error: errMsg
          };
          return [];
        }
      });

      const results = await Promise.all(executionPromises);
      for (const list of results) {
        rawOpportunities.push(...list);
      }
    }

    // 3. Filter by minimum confidence threshold if specified
    if (minConfidence > 0) {
      rawOpportunities = rawOpportunities.filter(
        opp => (opp.metadata.confidenceScore || 0) >= minConfidence
      );
    }

    // 4. Deduplicate if enabled
    const finalOpportunities = deduplicate 
      ? deduplicateOpportunities(rawOpportunities)
      : rawOpportunities;

    // 5. Apply query limit if specified
    const limitedOpportunities = query.limit && query.limit > 0
      ? finalOpportunities.slice(0, query.limit)
      : finalOpportunities;

    const durationMs = Date.now() - startTime;

    return {
      executionId,
      query,
      opportunities: limitedOpportunities,
      totalDiscovered: rawOpportunities.length,
      deduplicatedCount: rawOpportunities.length - finalOpportunities.length,
      providerStats,
      timestamp: new Date().toISOString(),
      durationMs,
      provenanceChain
    };
  }

  /**
   * Helper timeout wrapper
   */
  private executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Provider execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }
}
