import { IAppRepository } from "./IRepository";
import { RepositoryType } from "./types";

export class RepositoryRegistry {
  private static instance: RepositoryRegistry;
  private registry: Map<RepositoryType, IAppRepository> = new Map();

  private constructor() {}

  public static getInstance(): RepositoryRegistry {
    if (!RepositoryRegistry.instance) {
      RepositoryRegistry.instance = new RepositoryRegistry();
    }
    return RepositoryRegistry.instance;
  }

  public register(type: RepositoryType, repository: IAppRepository): void {
    this.registry.set(type, repository);
  }

  public get(type: RepositoryType): IAppRepository | undefined {
    return this.registry.get(type);
  }

  public listRegisteredTypes(): RepositoryType[] {
    return Array.from(this.registry.keys());
  }
}
