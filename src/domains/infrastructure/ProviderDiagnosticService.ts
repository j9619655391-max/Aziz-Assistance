import { ProviderManager } from "../../kernel/provider/ProviderManager";

export interface ProviderDiagnostic {
  name: string;
  version: string;
  health: "online" | "degraded" | "offline" | string;
  lastSuccess: string | null;
  lastFailure: string | null;
  averageLatency: number;
  cacheSize: number;
  cacheHitRate: number;
  rateLimitRemaining: number | null;
  authenticationStatus: string;
}

export class ProviderDiagnosticService {
  constructor(private providerManager: ProviderManager) {}

  /**
   * Evaluates and aggregates dynamic provider diagnostic metrics and health statuses
   */
  public async getDiagnosticsSummary(): Promise<{ providers: ProviderDiagnostic[]; telemetry: any }> {
    const healthStatuses = await this.providerManager.monitorHealth();
    
    const list = this.providerManager.getAllProviders().map(p => {
      const diag = p.getDiagnostics();
      return {
        name: p.metadata.name,
        version: p.metadata.version,
        health: healthStatuses[p.metadata.id] || "offline",
        lastSuccess: diag.lastSuccess ? diag.lastSuccess.toISOString() : null,
        lastFailure: diag.lastFailure ? diag.lastFailure.toISOString() : null,
        averageLatency: diag.averageLatencyMs,
        cacheSize: diag.cacheSize,
        cacheHitRate: diag.cacheHitRate,
        rateLimitRemaining: diag.rateLimitRemaining ?? null,
        authenticationStatus: diag.authenticationStatus
      };
    });

    return {
      providers: list,
      telemetry: this.providerManager.getTelemetry()
    };
  }
}
