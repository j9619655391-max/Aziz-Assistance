import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { SearchHistoryService } from "./SearchHistoryService";

export class KnowledgeModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "knowledge",
    name: "Knowledge Module",
    version: "1.0.0",
    description: "Search history, vector embeddings simulation, and platform search memory storage.",
    author: "Knowledge & Memory Domain",
    capabilities: ["SEARCH_HISTORY", "MEMORY_PERSISTENCE"],
    dependencies: ["repository"],
    requiredServices: ["SearchHistoryService"],
  };

  private searchHistoryService: SearchHistoryService | null = null;

  protected async startup(registry: any): Promise<void> {
    this.searchHistoryService = registry.searchHistoryService;
    if (!this.searchHistoryService) {
      throw new Error("Required dependency 'searchHistoryService' not available in service registry");
    }
  }

  protected async diagnostics() {
    const memories = this.searchHistoryService ? await this.searchHistoryService.getMemories() : [];
    return {
      memoryEntriesCount: memories.length,
    };
  }
}
