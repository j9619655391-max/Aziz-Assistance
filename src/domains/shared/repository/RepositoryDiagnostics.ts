import { RepositoryHealth, RepositoryMetrics, RepositoryType } from "./types";
import { RepositoryFactory } from "./RepositoryFactory";
import { RepositoryConfiguration } from "./RepositoryConfiguration";
import { RepositoryRegistry } from "./RepositoryRegistry";

export class RepositoryDiagnostics {
  private static startTime: number = Date.now();
  private static metrics: Record<RepositoryType, RepositoryMetrics> = {
    INMEMORY: { totalQueries: 0, totalWrites: 0, totalErrors: 0, averageLatencyMs: 0, uptimeSeconds: 0 },
    FIREBASE: { totalQueries: 0, totalWrites: 0, totalErrors: 0, averageLatencyMs: 0, uptimeSeconds: 0 },
    POSTGRES: { totalQueries: 0, totalWrites: 0, totalErrors: 0, averageLatencyMs: 0, uptimeSeconds: 0 },
    SQLITE: { totalQueries: 0, totalWrites: 0, totalErrors: 0, averageLatencyMs: 0, uptimeSeconds: 0 },
    MONGODB: { totalQueries: 0, totalWrites: 0, totalErrors: 0, averageLatencyMs: 0, uptimeSeconds: 0 }
  };

  /**
   * Run a thorough health check on the currently active repository
   */
  public static async checkActiveHealth(): Promise<RepositoryHealth> {
    const activeRepo = RepositoryFactory.getActiveRepository();
    const startTime = Date.now();
    try {
      const health = await activeRepo.health();
      return health;
    } catch (err: any) {
      return {
        status: "unhealthy",
        message: `Health check query failed: ${err.message}`,
        latencyMs: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      };
    }
  }

  /**
   * Records a database transaction/query performance metric
   */
  public static recordMetric(type: RepositoryType, operation: "query" | "write", latencyMs: number, hasError: boolean = false): void {
    const metric = this.metrics[type];
    if (!metric) return;

    if (operation === "query") {
      metric.totalQueries++;
    } else {
      metric.totalWrites++;
    }

    if (hasError) {
      metric.totalErrors++;
    }

    // Dynamic running average latency calculation
    const totalOps = metric.totalQueries + metric.totalWrites;
    metric.averageLatencyMs = Math.round(
      (metric.averageLatencyMs * (totalOps - 1) + latencyMs) / Math.max(1, totalOps)
    );
  }

  /**
   * Retrieves overall diagnostics summary for all systems
   */
  public static getDiagnosticsReport() {
    const config = RepositoryConfiguration.getInstance();
    const activeType = config.getRepositoryType();
    const registry = RepositoryRegistry.getInstance();
    const uptime = Math.round((Date.now() - this.startTime) / 1000);

    // Update uptime
    for (const type of Object.keys(this.metrics)) {
      this.metrics[type as RepositoryType].uptimeSeconds = uptime;
    }

    return {
      activeType,
      registeredTypes: registry.listRegisteredTypes(),
      metrics: this.metrics,
      uptimeSeconds: uptime,
      timestamp: new Date().toISOString()
    };
  }
}
