import { RepositoryType } from "./types";

export class RepositoryConfiguration {
  private static instance: RepositoryConfiguration;
  private currentType: RepositoryType = "INMEMORY";

  private constructor() {
    // Read from environment variable if provided, default to INMEMORY
    const envType = process.env.REPOSITORY_TYPE || process.env.DATABASE_TYPE;
    if (envType) {
      const sanitized = envType.toUpperCase();
      if (["INMEMORY", "FIREBASE", "POSTGRES", "SQLITE", "MONGODB"].includes(sanitized)) {
        this.currentType = sanitized as RepositoryType;
      }
    }
  }

  public static getInstance(): RepositoryConfiguration {
    if (!RepositoryConfiguration.instance) {
      RepositoryConfiguration.instance = new RepositoryConfiguration();
    }
    return RepositoryConfiguration.instance;
  }

  public getRepositoryType(): RepositoryType {
    return this.currentType;
  }

  public setRepositoryType(type: RepositoryType): void {
    this.currentType = type;
  }
}
