import { IModule, ModuleMetadata, ModuleState, ModuleHealth } from "./types";

export abstract class BaseModule implements IModule {
  public abstract metadata: ModuleMetadata;
  public state: ModuleState = "REGISTERED";
  public health: ModuleHealth = {
    status: "REGISTERED",
    lastCheck: new Date().toISOString(),
  };
  public config: Record<string, any> = {};

  private startupStartTime = 0;

  public async onStartup(registry: any): Promise<void> {
    this.state = "STARTING";
    this.startupStartTime = Date.now();
    try {
      await this.startup(registry);
      this.state = "RUNNING";
      this.health = {
        status: "RUNNING",
        startupTimeMs: Date.now() - this.startupStartTime,
        lastCheck: new Date().toISOString(),
      };
    } catch (err: any) {
      this.state = "FAILED";
      this.health = {
        status: "FAILED",
        errors: [err.message || String(err)],
        lastCheck: new Date().toISOString(),
      };
      throw err;
    }
  }

  public async onShutdown(): Promise<void> {
    this.state = "STOPPED";
    try {
      await this.shutdown();
      this.health = {
        status: "STOPPED",
        lastCheck: new Date().toISOString(),
      };
    } catch (err: any) {
      this.state = "FAILED";
      this.health = {
        status: "FAILED",
        errors: [err.message || String(err)],
        lastCheck: new Date().toISOString(),
      };
      throw err;
    }
  }

  public async onReload(newConfig: Record<string, any>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.reload(newConfig);
  }

  public async onDiagnostics(): Promise<Record<string, any>> {
    return this.diagnostics();
  }

  public async onHealthCheck(): Promise<ModuleHealth> {
    try {
      const customHealth = await this.healthCheck();
      this.health = customHealth;
      return customHealth;
    } catch (err: any) {
      const failedHealth: ModuleHealth = {
        status: "DEGRADED",
        errors: [err.message || String(err)],
        lastCheck: new Date().toISOString(),
      };
      this.health = failedHealth;
      return failedHealth;
    }
  }

  // Hook implementations to override
  protected abstract startup(registry: any): Promise<void>;
  protected async shutdown(): Promise<void> {}
  protected async reload(newConfig: Record<string, any>): Promise<void> {}
  protected async diagnostics(): Promise<Record<string, any>> {
    return {};
  }
  protected async healthCheck(): Promise<ModuleHealth> {
    return {
      status: this.state,
      startupTimeMs: this.health.startupTimeMs,
      errors: this.health.errors,
      warnings: this.health.warnings,
      lastCheck: new Date().toISOString(),
    };
  }
}
export default BaseModule;
