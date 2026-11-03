import { MetricsService } from "./MetricsService";
import { LogAggregationService } from "./LogAggregationService";

export class PerformanceProfiler {
  private activeMeasures: Map<string, number> = new Map();

  constructor(
    private metricsService: MetricsService,
    private logService: LogAggregationService
  ) {}

  /**
   * Starts a high-precision performance measurement block.
   */
  public startMeasure(label: string): void {
    // We use process.hrtime() or performance.now() for high precision.
    // performance.now() is standard and clean.
    this.activeMeasures.set(label, performance.now());
  }

  /**
   * Completes a performance measurement block and logs/records metrics.
   */
  public endMeasure(label: string, component: string = "profiler", tags: Record<string, string> = {}): number {
    const startTime = this.activeMeasures.get(label);
    if (startTime === undefined) {
      return 0;
    }

    const duration = performance.now() - startTime;
    this.activeMeasures.delete(label);

    // Record under general performance metric name
    this.metricsService.record("processing_duration_ms", duration, "latency", {
      ...tags,
      label,
      component,
    });

    // Also write a TRACE log for precision tracing
    this.logService.trace(
      component,
      `⏱️ Profiler measure completed for '${label}': ${duration.toFixed(3)}ms`,
      { label, duration, tags }
    );

    return duration;
  }

  /**
   * Profile synchronous or asynchronous function block execution.
   */
  public async profileBlock<T>(
    label: string,
    component: string,
    fn: () => Promise<T> | T,
    tags: Record<string, string> = {}
  ): Promise<T> {
    this.startMeasure(label);
    try {
      const result = await fn();
      this.endMeasure(label, component, { ...tags, status: "success" });
      return result;
    } catch (err: any) {
      this.endMeasure(label, component, { ...tags, status: "error", error: err.message || String(err) });
      throw err;
    }
  }

  /**
   * Obtains a snapshot of Node process memory and heap load.
   */
  public getMemorySnapshot() {
    const usage = process.memoryUsage();
    return {
      heapUsedBytes: usage.heapUsed,
      heapTotalBytes: usage.heapTotal,
      rssBytes: usage.rss,
      externalBytes: usage.external,
      arrayBuffersBytes: usage.arrayBuffers,
      timestamp: new Date().toISOString(),
    };
  }
}
