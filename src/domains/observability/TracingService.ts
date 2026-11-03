import { TraceSpan } from "./types";
import { getRequestId } from "../../kernel/context";

export class TracingService {
  private spans: TraceSpan[] = [];
  private readonly maxBufferSize = 5000;

  /**
   * Starts a new span in a trace.
   * If traceId is not provided, it falls back to current request context.
   */
  public startSpan(
    name: string,
    component: string,
    traceId?: string,
    parentSpanId?: string,
    metadata?: any
  ): TraceSpan {
    const activeTraceId = traceId || getRequestId() || `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const span: TraceSpan = {
      id: `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      traceId: activeTraceId,
      parentSpanId,
      name,
      component,
      startTime: Date.now(),
      status: "SUCCESS",
      metadata: metadata || null,
    };

    this.spans.push(span);
    if (this.spans.length > this.maxBufferSize) {
      this.spans.shift();
    }

    return span;
  }

  /**
   * Ends a span and calculates duration.
   */
  public endSpan(
    spanId: string,
    status: "SUCCESS" | "ERROR" = "SUCCESS",
    errorMessage?: string,
    metadata?: any
  ): TraceSpan | null {
    const span = this.spans.find((s) => s.id === spanId);
    if (!span) return null;

    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.status = status;
    if (errorMessage) {
      span.errorMessage = errorMessage;
    }
    if (metadata) {
      span.metadata = { ...span.metadata, ...metadata };
    }

    return span;
  }

  /**
   * Retrieves all spans belonging to a trace.
   */
  public getTrace(traceId: string): TraceSpan[] {
    return this.spans.filter((s) => s.traceId === traceId);
  }

  /**
   * Helper to perform a nested trace function block.
   */
  public async traceBlock<T>(
    name: string,
    component: string,
    fn: (spanId: string) => Promise<T>,
    parentSpanId?: string,
    metadata?: any
  ): Promise<T> {
    const span = this.startSpan(name, component, undefined, parentSpanId, metadata);
    try {
      const result = await fn(span.id);
      this.endSpan(span.id, "SUCCESS");
      return result;
    } catch (err: any) {
      this.endSpan(span.id, "ERROR", err.message || String(err));
      throw err;
    }
  }

  /**
   * Clears trace buffer.
   */
  public clearTraces(): void {
    this.spans = [];
  }
}
