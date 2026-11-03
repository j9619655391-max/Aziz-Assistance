import { getRequestId } from "../../kernel/context";

export interface StandardResponse<T = any> {
  success: boolean;
  requestId: string;
  timestamp: string;
  version: string;
  data: T | null;
  errors: string[];
  warnings: string[];
  executionMetrics: {
    apiLatencyMs: number;
    processLatencyMs?: number;
  };
}

export class ApiResponseFactory {
  public static createSuccess<T>(
    data: T,
    apiLatencyMs: number,
    processLatencyMs?: number,
    warnings: string[] = []
  ): StandardResponse<T> {
    return {
      success: true,
      requestId: getRequestId(),
      timestamp: new Date().toISOString(),
      version: "v1",
      data,
      errors: [],
      warnings,
      executionMetrics: {
        apiLatencyMs,
        processLatencyMs,
      },
    };
  }

  public static createError(
    errors: string[],
    apiLatencyMs: number,
    processLatencyMs?: number,
    warnings: string[] = []
  ): StandardResponse<null> {
    return {
      success: false,
      requestId: getRequestId(),
      timestamp: new Date().toISOString(),
      version: "v1",
      data: null,
      errors,
      warnings,
      executionMetrics: {
        apiLatencyMs,
        processLatencyMs,
      },
    };
  }
}
