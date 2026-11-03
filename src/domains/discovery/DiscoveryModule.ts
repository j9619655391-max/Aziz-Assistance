/**
 * @file /src/domains/discovery/DiscoveryModule.ts
 * @description Module lifecycle manager for Autonomous Opportunity Discovery Engine (EPIC 1).
 * Integrates with Kernel ModuleManager, registers discovery providers, and exposes health diagnostics.
 */

import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { providerManager } from "../../kernel/provider";
import { DiscoveryProviderRegistry } from "./DiscoveryProviderRegistry";
import { DataProviderToDiscoveryAdapter } from "./DataProviderToDiscoveryAdapter";

export class DiscoveryModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "discovery",
    name: "Discovery Engine Module",
    version: "1.0.0",
    description: "Autonomous opportunity discovery framework and unified provider execution pipeline.",
    author: "Career Architecture Engineering",
    capabilities: ["OPPORTUNITY_DISCOVERY", "MULTI_PROVIDER_PIPELINE", "UNIFIED_OPPORTUNITY_MODEL"],
    dependencies: ["provider", "repository"],
  };

  protected async startup(registry: any): Promise<void> {
    const discoveryRegistry = registry.discoveryProviderRegistry || DiscoveryProviderRegistry.getInstance();

    // Automatically adapt and register existing kernel providers
    if (providerManager) {
      const existingProviders = providerManager.getAllProviders();
      for (const p of existingProviders) {
        if (!discoveryRegistry.getProvider(p.metadata.id)) {
          const adapted = new DataProviderToDiscoveryAdapter(p);
          discoveryRegistry.registerProvider(adapted);
        }
      }
    }
  }

  protected async diagnostics() {
    const discoveryRegistry = DiscoveryProviderRegistry.getInstance();
    const allProviders = discoveryRegistry.getAllProviders();
    const activeProviders = discoveryRegistry.getActiveProviders();

    return {
      totalRegistered: allProviders.length,
      activeCount: activeProviders.length,
      providers: allProviders.map(p => ({
        id: p.metadata.id,
        name: p.metadata.name,
        priority: p.metadata.priority,
        capabilities: p.metadata.capabilities
      }))
    };
  }
}
