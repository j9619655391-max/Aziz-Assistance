/**
 * @file /src/kernel/ToolRegistry.ts
 * @description Type-safe, policy-driven in-memory Tool Registry implementing IToolRegistry.
 * Integrates schema validation, risk classification, permissions checks, timeouts, and automatic retry loops.
 */

import { IToolRegistry, ToolManifest, IEventBus, IStateStore } from "./types";

/**
 * Custom error thrown during argument schema validation errors.
 */
export class SchemaValidationError extends Error {
  constructor(public readonly path: string, message: string) {
    super(`Schema validation failed at "${path}": ${message}`);
    this.name = "SchemaValidationError";
  }
}

/**
 * Custom error thrown for security or permission-related violations.
 */
export class SecurityException extends Error {
  constructor(message: string) {
    super(`SecurityException: ${message}`);
    this.name = "SecurityException";
  }
}

/**
 * Configuration options for InMemoryToolRegistry.
 */
export interface ToolRegistryOptions {
  /** If provided, publishes ToolExecuted events */
  eventBus?: IEventBus;
  /** If provided, records tool invocation telemetry in active tasks */
  stateStore?: IStateStore;
  /** Set of explicit permissions granted to the runtime. If undefined, defaults to allow-all. */
  grantedPermissions?: string[];
  /** Dynamic callback to authorize tool execution requests. */
  permissionChecker?: (permissions: string[], toolId: string, taskId: string) => boolean;
  /** Maximum risk classification allowed to be registered or executed. Defaults to "high" (allow all). */
  maxAllowedRiskLevel?: "low" | "medium" | "high";
}

/**
 * Internal registry-specific telemetry structure.
 */
export interface RegistryTelemetry {
  invocations: number;
  successes: number;
  failures: number;
  retries: number;
  totalDurationMs: number;
  averageDurationMs: number;
}

const RISK_RANKS = { low: 1, medium: 2, high: 3 };

/**
 * Robust policy-driven in-memory tool container.
 */
export class InMemoryToolRegistry implements IToolRegistry {
  private readonly tools = new Map<
    string,
    { manifest: ToolManifest; handler: (args: any) => Promise<any> }
  >();

  // Internal telemetry trackers
  private readonly registryTelemetry: RegistryTelemetry = {
    invocations: 0,
    successes: 0,
    failures: 0,
    retries: 0,
    totalDurationMs: 0,
    averageDurationMs: 0
  };
  private readonly toolTelemetry = new Map<string, RegistryTelemetry>();

  constructor(private readonly options: ToolRegistryOptions = {}) {}

  /**
   * Helper function to deeply validate argument parameters against standard JSON Schema structures.
   */
  public static validateSchema(data: any, schema: any, path: string = "args"): void {
    if (!schema) return;

    // 1. Enum verification
    if (Array.isArray(schema.enum)) {
      if (!schema.enum.includes(data)) {
        throw new SchemaValidationError(
          path,
          `value must be one of [${schema.enum.join(", ")}], got ${JSON.stringify(data)}`
        );
      }
    }

    // 2. Type validation
    if (schema.type) {
      const type = schema.type;
      if (type === "string") {
        if (typeof data !== "string") {
          throw new SchemaValidationError(path, `expected string, got ${typeof data}`);
        }
      } else if (type === "number") {
        if (typeof data !== "number" || isNaN(data)) {
          throw new SchemaValidationError(path, `expected number, got ${typeof data}`);
        }
      } else if (type === "integer") {
        if (typeof data !== "number" || !Number.isInteger(data)) {
          throw new SchemaValidationError(path, `expected integer, got ${JSON.stringify(data)}`);
        }
      } else if (type === "boolean") {
        if (typeof data !== "boolean") {
          throw new SchemaValidationError(path, `expected boolean, got ${typeof data}`);
        }
      } else if (type === "array") {
        if (!Array.isArray(data)) {
          throw new SchemaValidationError(path, `expected array, got ${typeof data}`);
        }
        if (schema.items) {
          data.forEach((item, index) => {
            InMemoryToolRegistry.validateSchema(item, schema.items, `${path}[${index}]`);
          });
        }
      } else if (type === "object") {
        if (data === null || typeof data !== "object" || Array.isArray(data)) {
          throw new SchemaValidationError(path, `expected object, got ${typeof data}`);
        }

        // Validate required properties
        if (Array.isArray(schema.required)) {
          for (const reqProp of schema.required) {
            if (data[reqProp] === undefined) {
              throw new SchemaValidationError(path, `missing required property "${reqProp}"`);
            }
          }
        }

        // Validate nested properties
        if (schema.properties) {
          for (const key of Object.keys(schema.properties)) {
            if (data[key] !== undefined) {
              InMemoryToolRegistry.validateSchema(data[key], schema.properties[key], `${path}.${key}`);
            }
          }
        }
      }
    }
  }

  /**
   * Helper to validate the manifest structure itself to detect bad registrations early.
   */
  private validateManifest(manifest: ToolManifest): void {
    if (!manifest.id || typeof manifest.id !== "string") {
      throw new Error("ToolManifest validation failed: 'id' must be a non-empty string");
    }
    if (!manifest.name || typeof manifest.name !== "string") {
      throw new Error("ToolManifest validation failed: 'name' must be a non-empty string");
    }
    if (!manifest.description || typeof manifest.description !== "string") {
      throw new Error("ToolManifest validation failed: 'description' must be a non-empty string");
    }
    if (!Array.isArray(manifest.permissions)) {
      throw new Error("ToolManifest validation failed: 'permissions' must be an array of strings");
    }
    if (!["low", "medium", "high"].includes(manifest.riskLevel)) {
      throw new Error("ToolManifest validation failed: 'riskLevel' must be low, medium, or high");
    }
    if (typeof manifest.timeoutMs !== "number" || manifest.timeoutMs <= 0) {
      throw new Error("ToolManifest validation failed: 'timeoutMs' must be a positive integer");
    }
    if (typeof manifest.maxRetries !== "number" || manifest.maxRetries < 0) {
      throw new Error("ToolManifest validation failed: 'maxRetries' must be a non-negative integer");
    }
    if (!manifest.inputSchema || typeof manifest.inputSchema !== "object") {
      throw new Error("ToolManifest validation failed: 'inputSchema' must be a JSON Schema object");
    }
    if (!manifest.outputSchema || typeof manifest.outputSchema !== "object") {
      throw new Error("ToolManifest validation failed: 'outputSchema' must be a JSON Schema object");
    }
  }

  /**
   * Registers a brand new tool into the in-memory registry.
   * Performs early structural manifest and risk level verification.
   */
  public registerTool(manifest: ToolManifest, handler: (args: any) => Promise<any>): void {
    this.validateManifest(manifest);

    // Enforce maximum configured risk level policy
    const maxRisk = this.options.maxAllowedRiskLevel || "high";
    if (RISK_RANKS[manifest.riskLevel] > RISK_RANKS[maxRisk]) {
      throw new SecurityException(
        `Registration blocked: Tool "${manifest.id}" risk level "${manifest.riskLevel}" exceeds max allowed level "${maxRisk}"`
      );
    }

    // Set up default telemetry container for this specific tool ID
    if (!this.toolTelemetry.has(manifest.id)) {
      this.toolTelemetry.set(manifest.id, {
        invocations: 0,
        successes: 0,
        failures: 0,
        retries: 0,
        totalDurationMs: 0,
        averageDurationMs: 0
      });
    }

    // Overwrite/Register in the primary registry map
    this.tools.set(manifest.id, {
      manifest: JSON.parse(JSON.stringify(manifest)), // Isolate memory reference
      handler
    });
  }

  /**
   * Resolves and executes a tool with the provided arguments, enforcing policy controls.
   */
  public async executeTool(toolId: string, args: Record<string, any>, taskId: string): Promise<any> {
    const record = this.tools.get(toolId);
    if (!record) {
      throw new Error(`ToolNotFound: Tool with identifier "${toolId}" is not registered`);
    }

    const { manifest, handler } = record;
    const startTime = Date.now();
    let attempts = 0;
    let finalError: Error | null = null;
    let toolResult: any = null;

    // 1. Argument validation against inputSchema
    InMemoryToolRegistry.validateSchema(args, manifest.inputSchema);

    // 2. Permission and authorization checks
    this.authorize(manifest, toolId, taskId);

    // 3. Execution loop supporting timeout policy and retries policy
    while (attempts <= manifest.maxRetries) {
      const runStart = Date.now();
      try {
        if (attempts > 0) {
          this.registryTelemetry.retries++;
          const toolT = this.toolTelemetry.get(toolId)!;
          toolT.retries++;

          // Linear retry backoff to allow external transient failures to resolve
          await new Promise((resolve) => setTimeout(resolve, attempts * 50));
        }

        // Wrap execution in timeout race
        toolResult = await this.executeWithTimeout(handler, args, manifest.timeoutMs, toolId);
        finalError = null;
        break; // Successfully completed!
      } catch (err: any) {
        finalError = err;
        attempts++;
      }
    }

    const duration = Date.now() - startTime;

    // 4. Update Internal Telemetry Logs
    this.updateRegistryTelemetry(toolId, !finalError, duration, Math.max(0, attempts - 1));

    // 5. Update External StateStore Task Telemetry
    if (this.options.stateStore && taskId) {
      try {
        if (this.options.stateStore.getTaskState(taskId)) {
          this.options.stateStore.recordTelemetry(taskId, {
            durationMs: duration,
            toolInvocations: { [toolId]: 1 }
          });
        }
      } catch (e) {
        console.warn(`[ToolRegistry] Failed to log telemetry into task "${taskId}":`, e);
      }
    }

    // 6. Publish event via EventBus
    if (this.options.eventBus) {
      this.options.eventBus.publish({
        taskId,
        type: "ToolExecuted",
        payload: {
          toolId,
          success: !finalError,
          durationMs: duration,
          retries: Math.max(0, attempts - 1),
          error: finalError?.message || undefined,
          args: JSON.parse(JSON.stringify(args)),
          output: finalError ? undefined : JSON.parse(JSON.stringify(toolResult))
        }
      });
    }

    // Throw final error if retry exhaust failed
    if (finalError) {
      throw finalError;
    }

    // 7. Validate output structure against schema if success (soft warning on violation)
    try {
      InMemoryToolRegistry.validateSchema(toolResult, manifest.outputSchema, "output");
    } catch (outputErr: any) {
      console.warn(`[ToolRegistry] Output of tool "${toolId}" violated outputSchema contract:`, outputErr.message);
    }

    return toolResult;
  }

  /**
   * Retrieves all registered tool manifests.
   */
  public listTools(): ToolManifest[] {
    const list: ToolManifest[] = [];
    for (const record of this.tools.values()) {
      list.push(JSON.parse(JSON.stringify(record.manifest)));
    }
    return list;
  }

  /**
   * Returns a specific tool manifest, or null if not registered.
   */
  public getTool(toolId: string): ToolManifest | null {
    const record = this.tools.get(toolId);
    if (!record) return null;
    return JSON.parse(JSON.stringify(record.manifest));
  }

  /**
   * Retrieves execution telemetry analytics for the whole registry or a specific tool.
   */
  public getTelemetry(toolId?: string): RegistryTelemetry | null {
    if (toolId) {
      const t = this.toolTelemetry.get(toolId);
      return t ? { ...t } : null;
    }
    return { ...this.registryTelemetry };
  }

  /**
   * Purges registered tools and telemetry data.
   */
  public clear(): void {
    this.tools.clear();
    this.toolTelemetry.clear();
    this.registryTelemetry.invocations = 0;
    this.registryTelemetry.successes = 0;
    this.registryTelemetry.failures = 0;
    this.registryTelemetry.retries = 0;
    this.registryTelemetry.totalDurationMs = 0;
    this.registryTelemetry.averageDurationMs = 0;
  }

  /**
   * Internal permission auditor.
   */
  private authorize(manifest: ToolManifest, toolId: string, taskId: string): void {
    // 1. Static list check
    if (this.options.grantedPermissions) {
      const grantedSet = new Set(this.options.grantedPermissions);
      for (const requiredPerm of manifest.permissions) {
        if (!grantedSet.has(requiredPerm)) {
          throw new SecurityException(
            `Execution Blocked: Tool "${toolId}" requires permission "${requiredPerm}" which is absent from active granted permissions`
          );
        }
      }
    }

    // 2. Dynamic checker callback
    if (this.options.permissionChecker) {
      const allowed = this.options.permissionChecker(manifest.permissions, toolId, taskId);
      if (!allowed) {
        throw new SecurityException(
          `Execution Blocked: Dynamic permission auditor rejected permission group [${manifest.permissions.join(", ")}] requested by tool "${toolId}"`
        );
      }
    }
  }

  /**
   * Wraps an execution promise inside a race to enforce absolute timeout limits.
   */
  private async executeWithTimeout(
    handler: (args: any) => Promise<any>,
    args: any,
    timeoutMs: number,
    toolId: string
  ): Promise<any> {
    let timer: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`TimeoutException: Execution of tool "${toolId}" exceeded limit of ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([handler(args), timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /**
   * Updates internal telemetry metrics cleanly.
   */
  private updateRegistryTelemetry(toolId: string, success: boolean, durationMs: number, retries: number): void {
    // 1. Update Global
    this.registryTelemetry.invocations++;
    if (success) {
      this.registryTelemetry.successes++;
    } else {
      this.registryTelemetry.failures++;
    }
    this.registryTelemetry.totalDurationMs += durationMs;
    this.registryTelemetry.averageDurationMs = this.registryTelemetry.totalDurationMs / this.registryTelemetry.invocations;

    // 2. Update Tool Specific
    const toolT = this.toolTelemetry.get(toolId);
    if (toolT) {
      toolT.invocations++;
      if (success) {
        toolT.successes++;
      } else {
        toolT.failures++;
      }
      toolT.totalDurationMs += durationMs;
      toolT.averageDurationMs = toolT.totalDurationMs / toolT.invocations;
    }
  }
}
