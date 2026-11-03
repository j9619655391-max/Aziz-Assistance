import { IModule, ModuleState, ModuleHealth, DependencyNode } from "./types";

export class ModuleDependencyResolver {
  /**
   * Resolves a dependency graph using a topological sort.
   * Throws an error on circular dependencies.
   */
  public static resolve(nodes: DependencyNode[]): string[] {
    const sorted: string[] = [];
    const visited: Record<string, boolean> = {};
    const visiting: Record<string, boolean> = {};
    const nodeMap = new Map<string, DependencyNode>();

    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    const visit = (nodeId: string) => {
      if (visiting[nodeId]) {
        throw new Error(`Circular dependency detected involving module: ${nodeId}`);
      }
      if (!visited[nodeId]) {
        visiting[nodeId] = true;
        const node = nodeMap.get(nodeId);
        if (node) {
          for (const depId of node.dependencies) {
            if (nodeMap.has(depId)) {
              visit(depId);
            }
          }
        }
        visiting[nodeId] = false;
        visited[nodeId] = true;
        sorted.push(nodeId);
      }
    };

    for (const node of nodes) {
      if (!visited[node.id]) {
        visit(node.id);
      }
    }

    return sorted;
  }
}

export class ModuleManager {
  private static instance: ModuleManager | null = null;
  private modules: Map<string, IModule> = new Map();
  private startupOrder: string[] = [];

  private constructor() {}

  public static getInstance(): ModuleManager {
    if (!this.instance) {
      this.instance = new ModuleManager();
    }
    return this.instance;
  }

  /**
   * Registers a new module into the registry.
   */
  public register(module: IModule): void {
    const id = module.metadata.id;
    if (this.modules.has(id)) {
      throw new Error(`Module with ID '${id}' is already registered.`);
    }
    this.modules.set(id, module);
    module.state = "REGISTERED";
  }

  /**
   * Retrieve a specific module by ID.
   */
  public getModule(id: string): IModule | undefined {
    return this.modules.get(id);
  }

  /**
   * Get all registered modules.
   */
  public getModules(): IModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Evaluates the dependency graph and resolves the active startup order.
   */
  public resolveDependencies(): string[] {
    const nodes: DependencyNode[] = Array.from(this.modules.values()).map((m) => ({
      id: m.metadata.id,
      dependencies: m.metadata.dependencies,
    }));
    this.startupOrder = ModuleDependencyResolver.resolve(nodes);
    return this.startupOrder;
  }

  /**
   * Starts all registered modules following the calculated dependency graph order.
   */
  public async startupAll(registry: any): Promise<void> {
    this.resolveDependencies();
    console.log(`[ModuleManager] Resolved startup sequence: ${this.startupOrder.join(" -> ")}`);

    for (const id of this.startupOrder) {
      const module = this.modules.get(id);
      if (!module) continue;

      if (module.state === "DISABLED") {
        console.log(`[ModuleManager] Module '${id}' is disabled. Skipping startup.`);
        continue;
      }

      console.log(`[ModuleManager] Starting module: ${id}...`);
      module.state = "INITIALIZED";
      try {
        await module.onStartup(registry);
        console.log(`[ModuleManager] Module '${id}' started successfully.`);
      } catch (err: any) {
        console.error(`[ModuleManager] Failed to start module '${id}':`, err);
        module.state = "FAILED";
        // Re-throw if it's a critical core module or let other modules attempt to load
        // For Aziz, we will propagate the failure so we get complete robustness
        throw err;
      }
    }
  }

  /**
   * Stops all running modules in reverse dependency order.
   */
  public async shutdownAll(): Promise<void> {
    const shutdownOrder = [...this.startupOrder].reverse();
    console.log(`[ModuleManager] Resolved shutdown sequence: ${shutdownOrder.join(" -> ")}`);

    for (const id of shutdownOrder) {
      const module = this.modules.get(id);
      if (!module) continue;

      if (module.state !== "RUNNING" && module.state !== "DEGRADED" && module.state !== "STARTING") {
        continue;
      }

      console.log(`[ModuleManager] Stopping module: ${id}...`);
      try {
        await module.onShutdown();
        console.log(`[ModuleManager] Module '${id}' stopped successfully.`);
      } catch (err: any) {
        console.error(`[ModuleManager] Error shutting down module '${id}':`, err);
        module.state = "FAILED";
      }
    }
  }

  /**
   * Reload configuration for a specific module.
   */
  public async reloadModule(id: string, newConfig: Record<string, any>): Promise<void> {
    const module = this.getModule(id);
    if (!module) {
      throw new Error(`Module with ID '${id}' not found.`);
    }
    console.log(`[ModuleManager] Reloading config for module: ${id}`);
    await module.onReload(newConfig);
  }

  /**
   * Gracefully disable a module at runtime.
   */
  public async disableModule(id: string): Promise<void> {
    const module = this.getModule(id);
    if (!module) {
      throw new Error(`Module with ID '${id}' not found.`);
    }
    console.log(`[ModuleManager] Disabling module: ${id}`);
    if (module.state === "RUNNING" || module.state === "DEGRADED") {
      await module.onShutdown();
    }
    module.state = "DISABLED";
    module.health = {
      status: "DISABLED",
      lastCheck: new Date().toISOString(),
    };
  }

  /**
   * Gracefully re-enable and start a module at runtime.
   */
  public async enableModule(id: string, registry: any): Promise<void> {
    const module = this.getModule(id);
    if (!module) {
      throw new Error(`Module with ID '${id}' not found.`);
    }
    if (module.state !== "DISABLED") {
      return;
    }
    console.log(`[ModuleManager] Re-enabling module: ${id}`);
    module.state = "REGISTERED";
    await module.onStartup(registry);
  }

  /**
   * Gathers health metrics from all modules.
   */
  public async getHealthReport(): Promise<Record<string, ModuleHealth>> {
    const report: Record<string, ModuleHealth> = {};
    for (const [id, m] of this.modules) {
      report[id] = await m.onHealthCheck();
    }
    return report;
  }

  /**
   * Exposes structural and status diagnostics.
   */
  public async getDiagnosticsReport(): Promise<Record<string, any>> {
    const modulesDiagnostics: Record<string, any> = {};
    let runningCount = 0;
    let failedCount = 0;
    let disabledCount = 0;

    for (const [id, m] of this.modules) {
      const diagData = await m.onDiagnostics();
      modulesDiagnostics[id] = {
        metadata: m.metadata,
        state: m.state,
        health: m.health,
        diagnostics: diagData,
      };

      if (m.state === "RUNNING") runningCount++;
      else if (m.state === "FAILED") failedCount++;
      else if (m.state === "DISABLED") disabledCount++;
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalModules: this.modules.size,
        runningModules: runningCount,
        failedModules: failedCount,
        disabledModules: disabledCount,
      },
      startupOrder: this.startupOrder,
      shutdownOrder: [...this.startupOrder].reverse(),
      modules: modulesDiagnostics,
    };
  }

  /**
   * Returns a dictionary of all active platform capabilities.
   */
  public getCapabilitiesRegistry(): Record<string, string[]> {
    const capabilities: Record<string, string[]> = {};
    for (const m of this.modules.values()) {
      for (const cap of m.metadata.capabilities) {
        if (!capabilities[cap]) {
          capabilities[cap] = [];
        }
        capabilities[cap].push(m.metadata.id);
      }
    }
    return capabilities;
  }
}
export default ModuleManager;
