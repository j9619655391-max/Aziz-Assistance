import BaseModule from "../../kernel/module/BaseModule";
import { ModuleMetadata } from "../../kernel/module/types";
import { MetricsService } from "./MetricsService";
import { TracingService } from "./TracingService";
import { HealthService } from "./HealthService";
import { LogAggregationService } from "./LogAggregationService";
import { DiagnosticsService } from "./DiagnosticsService";
import { PerformanceProfiler } from "./PerformanceProfiler";
import { AlertService } from "./AlertService";
import { DashboardAggregator } from "./DashboardAggregator";

export class ObservabilityModule extends BaseModule {
  public metadata: ModuleMetadata = {
    id: "observability",
    name: "Enterprise Observability Module",
    version: "1.0.0",
    description: "Enterprise monitoring, real-time metrics, distributed tracing, alerting, and telemetry dashboards.",
    author: "Enterprise Operations Domain",
    capabilities: ["OBSERVABILITY_MONITORING", "DISTRIBUTED_TRACING", "LOG_AGGREGATION", "DIAGNOSTICS"],
    dependencies: ["repository"],
    requiredServices: [
      "MetricsService",
      "TracingService",
      "HealthService",
      "LogAggregationService",
      "DiagnosticsService",
      "PerformanceProfiler",
      "ObservabilityAlertService",
      "DashboardAggregator",
    ],
  };

  private metricsService: MetricsService | null = null;
  private tracingService: TracingService | null = null;
  private healthService: HealthService | null = null;
  private logAggregationService: LogAggregationService | null = null;
  private diagnosticsService: DiagnosticsService | null = null;
  private performanceProfiler: PerformanceProfiler | null = null;
  private observabilityAlertService: AlertService | null = null;
  private dashboardAggregator: DashboardAggregator | null = null;

  protected async startup(registry: any): Promise<void> {
    this.metricsService = registry.metricsService;
    this.tracingService = registry.tracingService;
    this.healthService = registry.healthService;
    this.logAggregationService = registry.logAggregationService;
    this.diagnosticsService = registry.diagnosticsService;
    this.performanceProfiler = registry.performanceProfiler;
    this.observabilityAlertService = registry.observabilityAlertService;
    this.dashboardAggregator = registry.dashboardAggregator;

    if (!this.metricsService) {
      throw new Error("MetricsService is not initialized in registry.");
    }
    if (!this.tracingService) {
      throw new Error("TracingService is not initialized in registry.");
    }
    if (!this.healthService) {
      throw new Error("HealthService is not initialized in registry.");
    }
    if (!this.logAggregationService) {
      throw new Error("LogAggregationService is not initialized in registry.");
    }
  }

  protected async diagnostics() {
    const report = this.healthService ? await this.healthService.getFullHealthReport() : null;
    return {
      healthStatus: report?.status ?? "DOWN",
      bufferedLogsCount: this.logAggregationService?.getLogs().length ?? 0,
      activeAlertsCount: this.observabilityAlertService?.getActiveAlerts().length ?? 0,
    };
  }
}
