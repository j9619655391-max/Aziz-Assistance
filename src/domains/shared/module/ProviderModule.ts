import BaseModule from "../../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../../kernel/module/types";
import { providerManager } from "../../../kernel/provider";

export class ProviderModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "provider",
    name: "Provider Module",
    version: "1.0.0",
    description: "External integration provider layer for search grounding, external tools, and integrations.",
    author: "Platform Engineering",
    capabilities: ["EXTERNAL_APIS", "SEARCH_GROUNDING"],
    dependencies: ["repository"],
  };

  protected async startup(registry: any): Promise<void> {
    // Verify providerManager exists
    if (!providerManager) {
      throw new Error("Provider manager not found in current context");
    }
  }

  protected async diagnostics() {
    return {
      providersCount: providerManager ? Object.keys(providerManager).length : 0,
    };
  }
}
