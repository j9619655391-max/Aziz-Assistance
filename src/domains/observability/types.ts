export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  traceId?: string;
  requestId?: string;
  metadata?: any;
}

export type MetricType = "latency" | "processing_time" | "usage" | "count" | "gauge" | "rate";

export interface MetricEntry {
  name: string;
  value: number;
  type: MetricType;
  timestamp: string;
  tags: Record<string, string>;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  component: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: "SUCCESS" | "ERROR";
  errorMessage?: string;
  metadata?: any;
}

export type HealthStatus = "UP" | "DOWN" | "DEGRADED";

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message: string;
  timestamp: string;
  details?: any;
}

export interface FullHealthReport {
  status: HealthStatus;
  timestamp: string;
  components: Record<string, ComponentHealth>;
}

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AlertEntry {
  id: string;
  timestamp: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  resolved: boolean;
  value?: number;
  threshold?: number;
}

export interface SystemDiagnostics {
  timestamp: string;
  health: FullHealthReport;
  metricsSummary: {
    totalRequests: number;
    errorRate: number;
    successRate: number;
    avgLatencyMs: number;
    avgAiProcessingTimeMs: number;
    activeSessions: number;
    activeWorkflows: number;
    queueDepth: number;
    systemLoad: {
      cpuUsagePercent: number;
      memoryUsageBytes: number;
      memoryUsagePercent: number;
    };
  };
  activeAlerts: AlertEntry[];
}
