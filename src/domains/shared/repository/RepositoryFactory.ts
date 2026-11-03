import { IAppRepository } from "./IRepository";
import { RepositoryConfiguration } from "./RepositoryConfiguration";
import { RepositoryRegistry } from "./RepositoryRegistry";
import { RepositoryType } from "./types";

export class RepositoryFactory {
  private static activeRepository: IAppRepository | null = null;

  /**
   * Retrieves the current active repository instance based on system configuration.
   */
  public static getActiveRepository(): IAppRepository {
    if (this.activeRepository) {
      return this.activeRepository;
    }

    const config = RepositoryConfiguration.getInstance();
    const type = config.getRepositoryType();
    const registry = RepositoryRegistry.getInstance();

    let repo = registry.get(type);
    if (!repo) {
      // Fallback to INMEMORY if the configured repository isn't registered or fully provisioned yet
      console.warn(`Configured repository type [${type}] is not registered. Falling back to [INMEMORY].`);
      repo = registry.get("INMEMORY");
    }

    if (!repo) {
      throw new Error("No repository implementations registered in the RepositoryRegistry, including INMEMORY fallback.");
    }

    this.activeRepository = repo;
    return repo;
  }

  /**
   * Clear active cached instance (useful if switching backends at runtime)
   */
  public static clearCache(): void {
    this.activeRepository = null;
  }
}
