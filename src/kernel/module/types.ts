export type ModuleState =
  | "REGISTERED"
  | "INITIALIZED"
  | "STARTING"
  | "RUNNING"
  | "DEGRADED"
  | "DISABLED"
  | "FAILED"
  | "STOPPED";

export interface ModuleMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: string[];
  dependencies: string[];
  configSchema?: Record<string, any>;
  requiredServices?: string[];
  optionalServices?: string[];
}

export interface ModuleHealth {
  status: ModuleState;
  startupTimeMs?: number;
  errors?: string[];
  warnings?: string[];
  lastCheck: string;
}

export interface IModule {
  metadata: ModuleMetadata;
  state: ModuleState;
  health: ModuleHealth;
  config: Record<string, any>;

  // Lifecycle Hooks
  onStartup(registry: any): Promise<void>;
  onShutdown(): Promise<void>;
  onReload(newConfig: Record<string, any>): Promise<void>;
  onDiagnostics(): Promise<Record<string, any>>;
  onHealthCheck(): Promise<ModuleHealth>;
}

export interface DependencyNode {
  id: string;
  dependencies: string[];
}
