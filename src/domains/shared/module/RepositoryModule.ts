import BaseModule from "../../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../../kernel/module/types";
import { RepositoryRegistry } from "../repository/RepositoryRegistry";
import { InMemoryRepository } from "../repository/InMemoryRepository";
import { FirebaseRepositorySkeleton } from "../repository/FirebaseRepositorySkeleton";
import { RepositoryFactory } from "../repository/RepositoryFactory";

export class RepositoryModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "repository",
    name: "Repository Module",
    version: "1.0.0",
    description: "Database and repository abstraction platform core.",
    author: "Platform Engineering",
    capabilities: ["STORAGE", "DATABASE_MANAGEMENT"],
    dependencies: [],
  };

  protected async startup(registry: any): Promise<void> {
    const repoRegistry = RepositoryRegistry.getInstance();
    // Safely re-register if needed, or simply verify registered
    try {
      repoRegistry.register("INMEMORY", new InMemoryRepository());
    } catch {
      // already registered
    }
    try {
      repoRegistry.register("FIREBASE", new FirebaseRepositorySkeleton());
    } catch {
      // already registered
    }
  }

  protected async healthCheck() {
    const activeRepo = RepositoryFactory.getActiveRepository();
    const isWorking = !!activeRepo;
    return {
      status: isWorking ? ("RUNNING" as const) : ("DEGRADED" as const),
      errors: isWorking ? [] : ["Active repository could not be resolved"],
      lastCheck: new Date().toISOString(),
    };
  }

  protected async diagnostics() {
    return {
      activeRepository: RepositoryFactory.getActiveRepository()?.constructor.name || "None",
    };
  }
}
