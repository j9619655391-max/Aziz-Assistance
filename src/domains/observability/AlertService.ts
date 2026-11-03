import { AlertEntry, AlertSeverity } from "./types";
import { MetricsService } from "./MetricsService";
import { LogAggregationService } from "./LogAggregationService";

export class AlertService {
  private alerts: AlertEntry[] = [];
  private readonly maxBufferSize = 200;

  constructor(
    private metricsService: MetricsService,
    private logService: LogAggregationService
  ) {}

  /**
   * Evaluates system rules against current metrics/health to trigger alerts.
   */
  public evaluateRules(healthReport: any): AlertEntry[] {
    const summary = this.metricsService.getMetricsSummary();

    // Rule 1: High Error Rate (> 10% in requests)
    if (summary.totalRequests >= 5 && summary.errorRate > 10) {
      this.raiseAlert(
        "High Error Rate",
        "CRITICAL",
        `API error rate is at ${summary.errorRate.toFixed(2)}% (threshold: 10%)`,
        summary.errorRate,
        10
      );
    } else {
      this.resolveAlert("High Error Rate");
    }

    // Rule 2: Slow Requests (avg latency > 2000ms)
    if (summary.avgLatencyMs > 2000) {
      this.raiseAlert(
        "Slow Requests",
        "WARNING",
        `Average request latency is ${summary.avgLatencyMs.toFixed(0)}ms (threshold: 2000ms)`,
        summary.avgLatencyMs,
        2000
      );
    } else {
      this.resolveAlert("Slow Requests");
    }

    // Rule 3: Memory Pressure (> 85% of memory heap)
    if (summary.systemLoad.memoryUsagePercent > 85) {
      this.raiseAlert(
        "Memory Pressure",
        "WARNING",
        `Memory utilization is high: ${summary.systemLoad.memoryUsagePercent}%`,
        summary.systemLoad.memoryUsagePercent,
        85
      );
    } else {
      this.resolveAlert("Memory Pressure");
    }

    // Rule 4: Coordinator Failure
    const coordinatorHealth = healthReport.components["Coordinator"];
    if (coordinatorHealth && coordinatorHealth.status === "DOWN") {
      this.raiseAlert(
        "Coordinator Failure",
        "CRITICAL",
        "The AI Intelligence Coordinator is offline or failed health checks."
      );
    } else {
      this.resolveAlert("Coordinator Failure");
    }

    // Rule 5: Module Manager degradation
    const moduleManagerHealth = healthReport.components["Module Manager"];
    if (moduleManagerHealth && moduleManagerHealth.status === "DEGRADED") {
      this.raiseAlert(
        "Workflow Failure",
        "WARNING",
        "Module manager is showing degraded performance or disabled critical modules."
      );
    } else {
      this.resolveAlert("Workflow Failure");
    }

    return this.getActiveAlerts();
  }

  /**
   * Raises a new alert or updates an existing active one.
   */
  public raiseAlert(
    ruleName: string,
    severity: AlertSeverity,
    message: string,
    value?: number,
    threshold?: number
  ): AlertEntry {
    const existing = this.alerts.find((a) => a.ruleName === ruleName && !a.resolved);
    
    if (existing) {
      existing.message = message;
      existing.severity = severity;
      existing.value = value;
      existing.timestamp = new Date().toISOString();
      return existing;
    }

    const alert: AlertEntry = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ruleName,
      severity,
      message,
      resolved: false,
      value,
      threshold,
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxBufferSize) {
      this.alerts.shift();
    }

    // Log the alert event as an error/warning
    const logMethod = severity === "CRITICAL" ? "error" : "warn";
    this.logService.log(
      severity === "CRITICAL" ? "ERROR" : "WARN",
      "observability-alert",
      `🚨 ALERT TRIGGERED [${severity}]: ${ruleName} - ${message}`,
      { alert }
    );

    return alert;
  }

  /**
   * Resolves an active alert.
   */
  public resolveAlert(ruleName: string): boolean {
    const alert = this.alerts.find((a) => a.ruleName === ruleName && !a.resolved);
    if (!alert) return false;

    alert.resolved = true;
    alert.timestamp = new Date().toISOString();

    this.logService.info(
      "observability-alert",
      `✅ ALERT RESOLVED: ${ruleName} - Anomaly cleared.`,
      { alertId: alert.id }
    );

    return true;
  }

  /**
   * Returns all active, unresolved alerts.
   */
  public getActiveAlerts(): AlertEntry[] {
    return this.alerts.filter((a) => !a.resolved);
  }

  /**
   * Returns historical alerts (both active and resolved).
   */
  public getAllAlerts(): AlertEntry[] {
    return this.alerts;
  }

  public clearAlerts(): void {
    this.alerts = [];
  }
}
