/**
 * @file /src/kernel/AgentRuntime.ts
 * @description Type-safe, policy-driven Agent Runtime implementing IAgentRuntime.
 * Handles agent registration, lifecycle management, context isolation, timeout safety, task cancellation,
 * and seamless state store/event bus integration.
 */

import { IAgentRuntime, IStateStore, IEventBus, TaskState, TaskStep } from "./types";

/**
 * Metadata configuration for an agent.
 */
export interface AgentManifest {
  /** Unique agent identifier */
  id: string;
  /** Human-friendly name of the agent */
  name: string;
  /** Detailed functional capabilities */
  description: string;
  /** Capability tags (e.g., ["coding", "sre", "testing"]) */
  capabilityTags: string[];
  /** Execution timeout limit in milliseconds */
  maxExecutionTimeMs: number;
}

/**
 * Execution context supplied to the running agent handler.
 */
export interface AgentExecutionContext {
  /** ID of the running task */
  taskId: string;
  /** Plaintext goal of the task */
  goal: string;
  /** Copy of the task steps */
  steps: TaskStep[];
  /** Access to the global state store */
  stateStore: IStateStore;
  /** Access to the centralized event bus */
  eventBus: IEventBus;
  /** Abort signal to listen for cancellation */
  signal: AbortSignal;
  /** Method to append runtime execution progress logs */
  log: (message: string) => void;
  /** Safely transition a specific task step to completed status */
  recordStepCompleted: (stepId: string, durationMs: number, outputLogs?: string[]) => void;
  /** Safely transition a specific task step to failed status */
  recordStepFailed: (stepId: string, error: string, durationMs: number) => void;
  /** Record execution resource usage (tokens, USD cost) */
  recordTelemetry: (tokens: number, cost: number) => void;
}

/**
 * Signature of the agent's work handler logic.
 */
export type AgentHandler = (context: AgentExecutionContext) => Promise<any>;

/**
 * Current lifecycle states of active agent runs.
 */
export type AgentLifecycleStatus = "idle" | "running" | "completed" | "failed" | "cancelled" | "timed_out";

/**
 * Consolidated runtime performance metrics.
 */
export interface RuntimeTelemetry {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  cancelledExecutions: number;
  timedOutExecutions: number;
  totalDurationMs: number;
  averageDurationMs: number;
  tokensConsumed: number;
  costInUSD: number;
}

export class AgentRegistrationError extends Error {
  constructor(message: string) {
    super(`AgentRegistrationError: ${message}`);
    this.name = "AgentRegistrationError";
  }
}

export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`AgentNotFoundError: Agent with identifier "${agentId}" is not registered`);
    this.name = "AgentNotFoundError";
  }
}

export class CancellationException extends Error {
  constructor(message: string = "Agent execution was cancelled") {
    super(message);
    this.name = "CancellationException";
  }
}

export class TimeoutException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutException";
  }
}

/**
 * Policy-driven orchestrator of task-oriented agents.
 */
export class AgentRuntime implements IAgentRuntime {
  private readonly agents = new Map<string, { manifest: AgentManifest; handler: AgentHandler }>();
  private readonly activeExecutions = new Map<string, AbortController>();
  private readonly executionStatus = new Map<string, AgentLifecycleStatus>();

  private readonly runtimeTelemetry: RuntimeTelemetry = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    cancelledExecutions: 0,
    timedOutExecutions: 0,
    totalDurationMs: 0,
    averageDurationMs: 0,
    tokensConsumed: 0,
    costInUSD: 0
  };

  constructor(
    private readonly stateStore: IStateStore,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Registers an agent under a unique identifier.
   */
  public registerAgent(manifest: AgentManifest, handler: AgentHandler): void {
    if (!manifest.id || typeof manifest.id !== "string") {
      throw new AgentRegistrationError("Agent 'id' must be a non-empty string");
    }
    if (!manifest.name || typeof manifest.name !== "string") {
      throw new AgentRegistrationError("Agent 'name' must be a non-empty string");
    }
    if (typeof manifest.maxExecutionTimeMs !== "number" || manifest.maxExecutionTimeMs <= 0) {
      throw new AgentRegistrationError("Agent 'maxExecutionTimeMs' must be a positive integer");
    }
    if (this.agents.has(manifest.id)) {
      throw new AgentRegistrationError(`Agent with ID "${manifest.id}" is already registered`);
    }

    this.agents.set(manifest.id, {
      manifest: JSON.parse(JSON.stringify(manifest)), // Isolate manifest memory reference
      handler
    });

    this.eventBus.publish({
      taskId: "SYSTEM",
      type: "AgentRegistered",
      payload: { agentId: manifest.id, name: manifest.name }
    });
  }

  /**
   * Returns a specific agent manifest, or null if not registered.
   */
  public getAgent(agentId: string): AgentManifest | null {
    const record = this.agents.get(agentId);
    if (!record) return null;
    return JSON.parse(JSON.stringify(record.manifest));
  }

  /**
   * Returns list of all registered agent manifests.
   */
  public listAgents(): AgentManifest[] {
    const list: AgentManifest[] = [];
    for (const record of this.agents.values()) {
      list.push(JSON.parse(JSON.stringify(record.manifest)));
    }
    return list;
  }

  /**
   * Retrieves active task execution IDs.
   */
  public getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  /**
   * Retrieves the internal lifecycle state of a specific task.
   */
  public getExecutionStatus(taskId: string): AgentLifecycleStatus | null {
    return this.executionStatus.get(taskId) || null;
  }

  /**
   * Triggers proactive manual cancellation of an active task.
   */
  public cancelTask(taskId: string): void {
    const controller = this.activeExecutions.get(taskId);
    if (!controller) {
      console.warn(`[AgentRuntime] Attempted to cancel task "${taskId}" but it is not running.`);
      return;
    }
    controller.abort();
    this.executionStatus.set(taskId, "cancelled");
  }

  /**
   * Retrieves global runtime telemetry.
   */
  public getTelemetry(): RuntimeTelemetry {
    return { ...this.runtimeTelemetry };
  }

  /**
   * Clears registration, executions, and telemetry counters.
   */
  public clear(): void {
    this.agents.clear();
    // Force abort any remaining executions
    for (const controller of this.activeExecutions.values()) {
      controller.abort();
    }
    this.activeExecutions.clear();
    this.executionStatus.clear();

    this.runtimeTelemetry.totalExecutions = 0;
    this.runtimeTelemetry.successfulExecutions = 0;
    this.runtimeTelemetry.failedExecutions = 0;
    this.runtimeTelemetry.cancelledExecutions = 0;
    this.runtimeTelemetry.timedOutExecutions = 0;
    this.runtimeTelemetry.totalDurationMs = 0;
    this.runtimeTelemetry.averageDurationMs = 0;
    this.runtimeTelemetry.tokensConsumed = 0;
    this.runtimeTelemetry.costInUSD = 0;
  }

  /**
   * Executes a task by orchestrating an active agent workspace context.
   */
  public async executeTask(taskId: string, agentId?: string): Promise<boolean> {
    const taskState = this.stateStore.getTaskState(taskId);
    if (!taskState) {
      throw new Error(`TaskNotFound: Task with identifier "${taskId}" does not exist in State Store`);
    }

    // 1. Resolve agent to use
    let targetAgentId = agentId;
    if (!targetAgentId) {
      if (this.agents.has("default")) {
        targetAgentId = "default";
      } else if (this.agents.size > 0) {
        targetAgentId = this.agents.keys().next().value!;
      } else {
        throw new Error("NoAgentsRegistered: Cannot execute task because no agents have been registered in the runtime");
      }
    }

    const agentRecord = this.agents.get(targetAgentId);
    if (!agentRecord) {
      throw new AgentNotFoundError(targetAgentId);
    }

    const { manifest, handler } = agentRecord;

    // 2. Set Task Status to running legally by moving through the state-machine sequence
    if (taskState.status === "pending") {
      this.stateStore.updateTaskStatus(taskId, "planning");
    }
    // Refresh taskState reference to get latest status if needed
    const currentTaskState = this.stateStore.getTaskState(taskId)!;
    if (currentTaskState.status === "planning") {
      this.stateStore.updateTaskStatus(taskId, "running");
    }
    
    this.executionStatus.set(taskId, "running");

    try {
      await this.runWithLifecycle(targetAgentId, taskId, handler, manifest, currentTaskState);
      
      // Move running -> verification -> reflection -> completed legally
      this.stateStore.updateTaskStatus(taskId, "verification");
      this.stateStore.updateTaskStatus(taskId, "reflection");
      this.stateStore.updateTaskStatus(taskId, "completed");
      this.executionStatus.set(taskId, "completed");
      
      this.eventBus.publish({
        taskId,
        type: "TaskCompleted",
        payload: { agentId: targetAgentId, success: true }
      });

      return true;
    } catch (err: any) {
      // From running or planning we can transition directly to failed
      this.stateStore.updateTaskStatus(taskId, "failed");
      
      const isCancelled = this.executionStatus.get(taskId) === "cancelled" || err instanceof CancellationException;
      const isTimeout = this.executionStatus.get(taskId) === "timed_out" || err instanceof TimeoutException;

      if (isCancelled) {
        this.executionStatus.set(taskId, "cancelled");
      } else if (isTimeout) {
        this.executionStatus.set(taskId, "timed_out");
      } else {
        this.executionStatus.set(taskId, "failed");
      }

      this.eventBus.publish({
        taskId,
        type: "TaskCompleted",
        payload: { 
          agentId: targetAgentId, 
          success: false, 
          error: err.message || String(err),
          cancelled: isCancelled,
          timedOut: isTimeout
        }
      });

      return false;
    }
  }

  /**
   * Internal lifecycle helper managing AbortControllers, timeout timers, and events.
   */
  private async runWithLifecycle(
    agentId: string,
    taskId: string,
    handler: AgentHandler,
    manifest: AgentManifest,
    state: TaskState
  ): Promise<any> {
    const controller = new AbortController();
    this.activeExecutions.set(taskId, controller);
    const startTime = Date.now();
    let timeoutTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      this.activeExecutions.delete(taskId);
      if (timeoutTimer) {
        clearTimeout(timeoutTimer);
      }
    };

    // Promise rejecting on cancellation
    const abortPromise = new Promise<never>((_, reject) => {
      if (controller.signal.aborted) {
        reject(new CancellationException("AgentExecutionCancelled: Task execution was cancelled prior to starting"));
        return;
      }
      controller.signal.addEventListener("abort", () => {
        if (this.executionStatus.get(taskId) === "timed_out") {
          return;
        }
        reject(new CancellationException("AgentExecutionCancelled: Task execution was cancelled during execution"));
      });
    });

    // Promise rejecting on timeout
    const timeoutMs = manifest.maxExecutionTimeMs;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutTimer = setTimeout(() => {
        this.executionStatus.set(taskId, "timed_out");
        controller.abort();
        reject(new TimeoutException(`AgentExecutionTimedOut: Agent run exceeded absolute limit of ${timeoutMs}ms`));
      }, timeoutMs);
    });

    // Build Execution Context
    const context: AgentExecutionContext = {
      taskId,
      goal: state.goal,
      steps: state.steps,
      stateStore: this.stateStore,
      eventBus: this.eventBus,
      signal: controller.signal,
      log: (message: string) => {
        this.eventBus.publish({
          taskId,
          type: "AgentExecutionProgress",
          payload: { message, timestamp: new Date().toISOString() }
        });
      },
      recordStepCompleted: (stepId, durationMs, outputLogs) => {
        this.stateStore.updateStep(taskId, stepId, {
          status: "completed",
          durationMs,
          logs: outputLogs
        });
      },
      recordStepFailed: (stepId, error, durationMs) => {
        this.stateStore.updateStep(taskId, stepId, {
          status: "failed",
          error,
          durationMs
        });
      },
      recordTelemetry: (tokens, cost) => {
        this.stateStore.recordTelemetry(taskId, {
          tokensUsed: tokens,
          costInUSD: cost
        });
        this.runtimeTelemetry.tokensConsumed += tokens;
        this.runtimeTelemetry.costInUSD += cost;
      }
    };

    try {
      this.eventBus.publish({
        taskId,
        type: "AgentExecutionStarted",
        payload: { agentId, timestamp: new Date().toISOString() }
      });

      // Race handler vs. cancellation vs. timeout
      const result = await Promise.race([
        handler(context),
        abortPromise,
        timeoutPromise
      ]);

      const durationMs = Date.now() - startTime;
      this.updateTelemetry(true, durationMs, false, false);

      this.eventBus.publish({
        taskId,
        type: "AgentExecutionCompleted",
        payload: { agentId, durationMs, output: result }
      });

      return result;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isCancelled = err instanceof CancellationException;
      const isTimeout = err instanceof TimeoutException;

      this.updateTelemetry(false, durationMs, isCancelled, isTimeout);

      if (isCancelled) {
        this.eventBus.publish({
          taskId,
          type: "AgentExecutionCancelled",
          payload: { agentId, durationMs, error: err.message }
        });
      } else if (isTimeout) {
        this.eventBus.publish({
          taskId,
          type: "AgentExecutionTimedOut",
          payload: { agentId, durationMs, error: err.message }
        });
      } else {
        this.eventBus.publish({
          taskId,
          type: "AgentExecutionFailed",
          payload: { agentId, durationMs, error: err.message || String(err) }
        });
      }

      throw err;
    } finally {
      cleanup();
    }
  }

  /**
   * Atomically updates telemetry metrics.
   */
  private updateTelemetry(success: boolean, durationMs: number, cancelled: boolean, timedOut: boolean): void {
    this.runtimeTelemetry.totalExecutions++;
    if (success) {
      this.runtimeTelemetry.successfulExecutions++;
    } else if (cancelled) {
      this.runtimeTelemetry.cancelledExecutions++;
    } else if (timedOut) {
      this.runtimeTelemetry.timedOutExecutions++;
    } else {
      this.runtimeTelemetry.failedExecutions++;
    }
    this.runtimeTelemetry.totalDurationMs += durationMs;
    this.runtimeTelemetry.averageDurationMs = this.runtimeTelemetry.totalDurationMs / this.runtimeTelemetry.totalExecutions;
  }
}
