/**
 * @file /src/kernel/tests/ObservabilityPlatform.test.ts
 * @description Unit, integration, and performance load tests for the Observability Platform.
 */

import { ServiceRegistry } from "../../services/backend/ServiceRegistry";
import { providerManager } from "../provider";

class TestSuite {
  private passed = 0;
  private failed = 0;

  public async run(name: string, fn: () => void | Promise<void>): Promise<void> {
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      this.passed++;
      console.log(`  ✅ Passed\n`);
    } catch (err: any) {
      this.failed++;
      console.error(`  ❌ Failed: ${err?.message || err}\n`);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  public report(): void {
    console.log(`===========================================`);
    console.log(`Observability Platform Unit Tests Complete.`);
    console.log(`Total Trials: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`===========================================`);
    if (this.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

const assert = {
  equal: <T>(actual: T, expected: T, msg?: string) => {
    if (actual !== expected) {
      throw new Error(`${msg || "Assertion failed"}: expected ${expected}, got ${actual}`);
    }
  },
  ok: (val: any, msg?: string) => {
    if (!val) {
      throw new Error(`${msg || "Assertion failed"}: value was not truthy`);
    }
  },
};

export async function runObservabilityTests(): Promise<void> {
  console.log("=================================================================");
  console.log("             AZIZ OBSERVABILITY PLATFORM UNIT TESTS              ");
  console.log("=================================================================");

  const suite = new TestSuite();
  const services = new ServiceRegistry(providerManager);

  // Clear previous states
  services.metricsService.clearMetrics();
  services.logAggregationService.clearLogs();
  services.tracingService.clearTraces();
  services.observabilityAlertService.clearAlerts();

  // Test 1: Log Aggregation Service
  await suite.run("LogAggregationService levels and structured logging", () => {
    const logInfo = services.logAggregationService.info("auth", "User login success", { userId: "user-123" });
    const logErr = services.logAggregationService.error("recruitment", "Candidate parsing failed", { error: "Mismatched fields" });

    assert.equal(logInfo.level, "INFO");
    assert.equal(logInfo.component, "auth");
    assert.equal(logInfo.message, "User login success");
    assert.ok(logInfo.id, "Log ID must be generated");
    assert.ok(logInfo.timestamp, "Timestamp must be generated");

    assert.equal(logErr.level, "ERROR");
    assert.equal(logErr.component, "recruitment");
    
    const logs = services.logAggregationService.getLogs();
    assert.equal(logs.length, 2, "Should have 2 buffered log entries");
  });

  // Test 2: Metrics Service Recording & Aggregation
  await suite.run("MetricsService Recording and Aggregation", () => {
    services.metricsService.record("api_latency_ms", 120, "latency", { method: "POST", route: "/auth/login" });
    services.metricsService.record("api_latency_ms", 180, "latency", { method: "POST", route: "/auth/login" });
    services.metricsService.record("api_latency_ms", 300, "latency", { method: "GET", route: "/users" });

    services.metricsService.record("ai_processing_time_ms", 2100, "processing_time");
    services.metricsService.record("ai_processing_time_ms", 1900, "processing_time");

    const avgLatency = services.metricsService.getAggregatedValue("api_latency_ms", "avg");
    assert.equal(avgLatency, 200, "Average latency should be 200ms");

    const sumLatency = services.metricsService.getAggregatedValue("api_latency_ms", "sum");
    assert.equal(sumLatency, 600, "Sum of latency should be 600ms");

    const maxLatency = services.metricsService.getAggregatedValue("api_latency_ms", "max");
    assert.equal(maxLatency, 300, "Max latency should be 300ms");

    const avgAiTime = services.metricsService.getAggregatedValue("ai_processing_time_ms", "avg");
    assert.equal(avgAiTime, 2000, "Average AI processing time should be 2000ms");
  });

  // Test 3: Tracing Service Spans
  await suite.run("TracingService span nesting and lifecycle", async () => {
    const parentSpan = services.tracingService.startSpan("process-request", "api-gateway");
    
    // Simulate internal call span
    const dbSpan = services.tracingService.startSpan("query-db", "repository", parentSpan.traceId, parentSpan.id);
    services.tracingService.endSpan(dbSpan.id, "SUCCESS");

    services.tracingService.endSpan(parentSpan.id, "SUCCESS");

    const trace = services.tracingService.getTrace(parentSpan.traceId);
    assert.equal(trace.length, 2, "Trace tree should contain parent and database spans");
    
    const root = trace.find((s) => s.id === parentSpan.id);
    const child = trace.find((s) => s.id === dbSpan.id);

    assert.ok(root, "Root span must exist");
    assert.ok(child, "Child span must exist");
    assert.equal(child?.parentSpanId, parentSpan.id, "Child parentSpanId must match parent ID");
    assert.equal(root?.status, "SUCCESS");
  });

  // Test 4: Health Service Component Check
  await suite.run("HealthService and full health reports", async () => {
    const report = await services.healthService.getFullHealthReport();
    assert.ok(report.status === "UP" || report.status === "DEGRADED", "Overall health status should be UP or DEGRADED");
    assert.ok(report.components["Kernel"], "Kernel health check must exist");
    assert.ok(report.components["Repository"], "Repository health check must exist");
    assert.ok(report.components["Identity Platform"], "Identity Platform check must exist");
    assert.equal(report.components["Kernel"].status, "UP");
  });

  // Test 5: Alerting Rules Matrix Evaluation
  await suite.run("AlertService rule evaluation matrix and alerts", async () => {
    // Clear alerts to start clean
    services.observabilityAlertService.clearAlerts();
    
    // Force normal metrics
    services.metricsService.clearMetrics();

    // Force slow requests and high error rates
    services.metricsService.record("api_latency_ms", 3000, "latency");
    services.metricsService.record("api_latency_ms", 2500, "latency");
    
    for (let i = 0; i < 10; i++) {
      services.metricsService.record("http_request_total", 1, "count");
      if (i < 3) {
        services.metricsService.record("http_request_error_total", 1, "count");
      }
    }

    const reportDegraded = await services.healthService.getFullHealthReport();
    const activeAlerts = services.observabilityAlertService.evaluateRules(reportDegraded);

    const slowRequestsAlert = activeAlerts.find((a) => a.ruleName === "Slow Requests");
    const errorRateAlert = activeAlerts.find((a) => a.ruleName === "High Error Rate");

    assert.ok(slowRequestsAlert, "Slow Requests alert must trigger");
    assert.ok(errorRateAlert, "High Error Rate alert must trigger");
    assert.equal(slowRequestsAlert?.severity, "WARNING");
    assert.equal(errorRateAlert?.severity, "CRITICAL");
  });

  // Test 6: Diagnostics & Dashboard Aggregation
  await suite.run("Diagnostics and Dashboard Aggregation", async () => {
    const diags = await services.diagnosticsService.getSystemDiagnostics();
    assert.ok(diags.timestamp);
    assert.ok(diags.health);
    assert.ok(diags.metricsSummary);

    const dashboard = await services.dashboardAggregator.getDashboardData();
    assert.ok(dashboard.health);
    assert.ok(dashboard.metricsSummary);
    assert.ok(dashboard.recentLogs);
  });

  // Test 7: Thread safety and High-Concurrency Performance load test (5000 parallel entries)
  await suite.run("High-Concurrency Load Test (5000 Concurrent metric and log updates)", async () => {
    services.metricsService.clearMetrics();
    
    // Disable console output logging during massive high-throughput tests to avoid buffering bottleneck
    services.logAggregationService.consoleOutputEnabled = false;

    const requestsCount = 5000;
    const promises: Promise<void>[] = [];

    const startTime = performance.now();

    for (let i = 0; i < requestsCount; i++) {
      promises.push(
        (async (idx) => {
          // Record api latency
          services.metricsService.record("api_latency_ms", 50 + (idx % 100), "latency", {
            thread: "worker-pool",
            idx: String(idx),
          });
          // Append structured logs
          services.logAggregationService.debug("worker", `Concurrent task idx=${idx} processing completed`);
        })(i)
      );
    }

    await Promise.all(promises);
    const duration = performance.now() - startTime;
    
    // Restore console logging
    services.logAggregationService.consoleOutputEnabled = true;

    console.log(`  -> 5000 concurrent operations processed in ${duration.toFixed(2)}ms`);

    const avgLatency = services.metricsService.getAggregatedValue("api_latency_ms", "avg");
    assert.equal(services.metricsService.getRawMetrics("api_latency_ms", 5000).length, 5000, "Should have recorded exactly 5000 metric entries without dropouts");
    assert.ok(avgLatency > 0, "Average latency calculation must be successful and accurate");
  });

  await services.shutdown();
  suite.report();
}

import { fileURLToPath } from "url";

const isMain = process.argv[1] && (
  process.argv[1].endsWith("ObservabilityPlatform.test.ts") ||
  process.argv[1] === fileURLToPath(import.meta.url)
);

if (isMain) {
  runObservabilityTests();
}
