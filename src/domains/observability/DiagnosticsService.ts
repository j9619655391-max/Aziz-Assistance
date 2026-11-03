import { SystemDiagnostics } from "./types";
import { HealthService } from "./HealthService";
import { MetricsService } from "./MetricsService";
import { AlertService } from "./AlertService";
import { LogAggregationService } from "./LogAggregationService";

export class DiagnosticsService {
  constructor(
    private healthService: HealthService,
    private metricsService: MetricsService,
    private alertService: AlertService,
    private logService: LogAggregationService
  ) {}

  /**
   * Compiles and outputs complete enterprise diagnostics snapshot
   */
  public async getSystemDiagnostics(): Promise<SystemDiagnostics> {
    const health = await this.healthService.getFullHealthReport();
    
    // Evaluate alerting rules based on latest metrics/health status
    const activeAlerts = this.alertService.evaluateRules(health);
    const metricsSummary = this.metricsService.getMetricsSummary();

    const diagnostics: SystemDiagnostics = {
      timestamp: new Date().toISOString(),
      health,
      metricsSummary,
      activeAlerts,
    };

    // Log diagnostic completion
    this.logService.debug(
      "diagnostics-service",
      `Compiled system diagnostics. Status: ${health.status}. Active Alerts: ${activeAlerts.length}`,
      { activeAlertsCount: activeAlerts.length }
    );

    return diagnostics;
  }

  /**
   * Generates a deep core dump / snapshot of recent warnings, errors, and system details.
   */
  public async getDiagnosticDump() {
    const systemDiag = await this.getSystemDiagnostics();
    const recentErrors = this.logService.getLogs({ level: "ERROR", limit: 20 });
    const recentWarnings = this.logService.getLogs({ level: "WARN", limit: 20 });
    const systemLogs = this.logService.getLogs({ limit: 50 });

    return {
      systemDiagnostics: systemDiag,
      recentErrors,
      recentWarnings,
      systemLogs,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        env: process.env.NODE_ENV || "development",
      },
    };
  }
}
