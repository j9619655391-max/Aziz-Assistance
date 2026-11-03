import { HealthService } from "./HealthService";
import { MetricsService } from "./MetricsService";
import { AlertService } from "./AlertService";
import { LogAggregationService } from "./LogAggregationService";
import { TracingService } from "./TracingService";

export class DashboardAggregator {
  constructor(
    private healthService: HealthService,
    private metricsService: MetricsService,
    private alertService: AlertService,
    private logService: LogAggregationService,
    private tracingService: TracingService
  ) {}

  /**
   * Compiles the unified telemetry dashboard dataset
   */
  public async getDashboardData() {
    const health = await this.healthService.getFullHealthReport();
    const activeAlerts = this.alertService.evaluateRules(health);
    const metricsSummary = this.metricsService.getMetricsSummary();
    const recentLogs = this.logService.getLogs({ limit: 100 });
    const allAlerts = this.alertService.getAllAlerts();

    return {
      timestamp: new Date().toISOString(),
      health,
      activeAlerts,
      metricsSummary,
      recentLogs,
      historicalAlertsCount: allAlerts.length,
    };
  }
}
