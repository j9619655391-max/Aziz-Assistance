import { LogEntry, LogLevel } from "./types";
import { getRequestId } from "../../kernel/context";

export class LogAggregationService {
  private logs: LogEntry[] = [];
  private readonly maxBufferSize = 2000;
  public consoleOutputEnabled = true;

  /**
   * Appends a new structured log entry.
   * Ensures thread safety and bounded buffer size.
   */
  public log(
    level: LogLevel,
    component: string,
    message: string,
    metadata?: any,
    traceId?: string
  ): LogEntry {
    const activeRequestId = getRequestId();
    
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      traceId: traceId || activeRequestId || "N/A",
      requestId: activeRequestId || "N/A",
      metadata: metadata || null,
    };

    // Buffer management
    this.logs.push(entry);
    if (this.logs.length > this.maxBufferSize) {
      this.logs.shift();
    }

    // Output to stdout as a single-line structured JSON string
    if (this.consoleOutputEnabled) {
      console.log(JSON.stringify(entry));
    }

    return entry;
  }

  public trace(component: string, message: string, metadata?: any, traceId?: string): LogEntry {
    return this.log("TRACE", component, message, metadata, traceId);
  }

  public debug(component: string, message: string, metadata?: any, traceId?: string): LogEntry {
    return this.log("DEBUG", component, message, metadata, traceId);
  }

  public info(component: string, message: string, metadata?: any, traceId?: string): LogEntry {
    return this.log("INFO", component, message, metadata, traceId);
  }

  public warn(component: string, message: string, metadata?: any, traceId?: string): LogEntry {
    return this.log("WARN", component, message, metadata, traceId);
  }

  public error(component: string, message: string, metadata?: any, traceId?: string): LogEntry {
    return this.log("ERROR", component, message, metadata, traceId);
  }

  public fatal(component: string, message: string, metadata?: any, traceId?: string): LogEntry {
    return this.log("FATAL", component, message, metadata, traceId);
  }

  /**
   * Retrieves all buffered logs with optional filtering.
   */
  public getLogs(filters?: {
    level?: LogLevel;
    component?: string;
    traceId?: string;
    requestId?: string;
    search?: string;
    limit?: number;
  }): LogEntry[] {
    let result = [...this.logs];

    if (filters) {
      if (filters.level) {
        result = result.filter((l) => l.level === filters.level);
      }
      if (filters.component) {
        result = result.filter((l) => l.component.toLowerCase() === filters.component!.toLowerCase());
      }
      if (filters.traceId) {
        result = result.filter((l) => l.traceId === filters.traceId);
      }
      if (filters.requestId) {
        result = result.filter((l) => l.requestId === filters.requestId);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (l) =>
            l.message.toLowerCase().includes(searchLower) ||
            l.component.toLowerCase().includes(searchLower)
        );
      }
      if (filters.limit) {
        result = result.slice(-filters.limit);
      }
    }

    return result;
  }

  /**
   * Clears the log buffer.
   */
  public clearLogs(): void {
    this.logs = [];
  }
}
