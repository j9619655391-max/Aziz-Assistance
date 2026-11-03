/**
 * @file /src/kernel/StateStore.ts
 * @description Real-time memory-based Task State Store implementing IStateStore.
 * Enforces transaction safety, deep-copy read safety, and strict state machine transitions.
 */

import { IStateStore, TaskState, TaskStatus, TaskStep, TaskTelemetry } from "./types";

/**
 * Strict mapping of allowed source-to-target state machine transitions.
 * Ensures the runtime state remains coherent and prevents circular logic leaks.
 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ["planning"],
  planning: ["running", "failed"],
  running: ["verification", "failed"],
  verification: ["running", "planning", "reflection", "failed"],
  reflection: ["completed", "planning", "failed"],
  completed: [],
  failed: []
};

/**
 * Robust in-memory state store implementing the IStateStore interface contract.
 * Leverages thread-safe dictionary structures and protects states via read-only deep copies.
 */
export class InMemoryStateStore implements IStateStore {
  /** Private internal map storing all task states in memory */
  private readonly tasksMap: Map<string, TaskState> = new Map<string, TaskState>();

  /**
   * Safe deep-copy helper to insulate stored states from client modifications.
   * @param data The object to clone
   */
  private clone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /**
   * Generates a safe, collision-resistant random tracking ID.
   */
  private generateId(): string {
    const randomHex = (): string => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    return `task_${randomHex()}${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}-${randomHex()}${randomHex()}${randomHex()}`;
  }

  /**
   * Initializes a new task state entry in memory.
   * Sets up default telemetry matrices and empty step queues.
   * @param goal The plain text goal describing target end-state
   * @returns Uniquely generated UUID string identifying the task
   */
  public createTask(goal: string): string {
    if (!goal || goal.trim().length === 0) {
      throw new Error("Task initialization aborted: goal string cannot be empty.");
    }

    const taskId = this.generateId();
    const timestamp = new Date().toISOString();

    const initialTelemetry: TaskTelemetry = {
      tokensUsed: 0,
      promptTokens: 0,
      completionTokens: 0,
      costInUSD: 0,
      durationMs: 0,
      toolInvocations: {}
    };

    const initialTask: TaskState = {
      taskId,
      goal: goal.trim(),
      status: "pending",
      steps: [],
      telemetry: initialTelemetry,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this.tasksMap.set(taskId, initialTask);
    return taskId;
  }

  /**
   * Transactionally updates the parent status of a task.
   * Blocks impossible or invalid state transitions to ensure machine safety.
   * @param taskId Unique identifier for target task
   * @param status Next state in transition matrix
   */
  public updateTaskStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasksMap.get(taskId);
    if (!task) {
      throw new Error(`State Update Failed: Task ID "${taskId}" not found.`);
    }

    const currentStatus = task.status;
    
    // Check if the state transition is legally allowed
    const validDestinations = ALLOWED_TRANSITIONS[currentStatus];
    if (!validDestinations.includes(status)) {
      throw new Error(
        `Illegal State Machine Transition: Cannot transition task "${taskId}" from "${currentStatus}" to "${status}". Allowed targets: ${validDestinations.join(", ") || "None"}`
      );
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();
  }

  /**
   * Partially modifies an individual execution step inside the task queue.
   * If the stepId is not found, a new step is appended to support dynamic execution paths.
   * @param taskId Unique identifier for parent task
   * @param stepId Unique logical identifier for target step
   * @param updates Object containing modifications
   */
  public updateStep(taskId: string, stepId: string, updates: Partial<TaskStep>): void {
    const task = this.tasksMap.get(taskId);
    if (!task) {
      throw new Error(`Step Update Failed: Parent Task ID "${taskId}" not found.`);
    }

    const stepIndex = task.steps.findIndex(s => s.stepId === stepId);
    
    if (stepIndex === -1) {
      // Step not found, append it as a new execution target
      const newStep: TaskStep = {
        stepId,
        name: updates.name || `Step ${stepId}`,
        status: updates.status || "pending",
        durationMs: updates.durationMs,
        logs: updates.logs ? [...updates.logs] : [],
        error: updates.error,
        toolId: updates.toolId
      };
      task.steps.push(newStep);
    } else {
      // Step found, merge existing properties
      const existingStep = task.steps[stepIndex];
      
      const mergedLogs = updates.logs 
        ? [...(existingStep.logs || []), ...updates.logs]
        : existingStep.logs;

      task.steps[stepIndex] = {
        ...existingStep,
        ...updates,
        logs: mergedLogs
      };
    }

    task.updatedAt = new Date().toISOString();
  }

  /**
   * Atomically records incremental LLM token usage or tool execution metrics.
   * @param taskId Unique identifier for parent task
   * @param usage Metric values to increment/track
   */
  public recordTelemetry(taskId: string, usage: Partial<TaskTelemetry>): void {
    const task = this.tasksMap.get(taskId);
    if (!task) {
      throw new Error(`Telemetry Update Failed: Task ID "${taskId}" not found.`);
    }

    const currentTelemetry = task.telemetry;

    // Increment base numerical tokens & cost structures
    currentTelemetry.tokensUsed += usage.tokensUsed || 0;
    currentTelemetry.promptTokens += usage.promptTokens || 0;
    currentTelemetry.completionTokens += usage.completionTokens || 0;
    currentTelemetry.costInUSD += usage.costInUSD || 0;
    currentTelemetry.durationMs += usage.durationMs || 0;

    // Merge incremental tool invocation analytics
    if (usage.toolInvocations) {
      for (const [toolId, count] of Object.entries(usage.toolInvocations)) {
        currentTelemetry.toolInvocations[toolId] = (currentTelemetry.toolInvocations[toolId] || 0) + count;
      }
    }

    task.updatedAt = new Date().toISOString();
  }

  /**
   * Optionally updates standardized module version metadata for the task.
   */
  public updateTaskMetadata(
    taskId: string,
    metadata: {
      planner_version?: string;
      context_policy_version?: string;
      verification_policy_version?: string;
      reflection_version?: string;
    }
  ): void {
    const task = this.tasksMap.get(taskId);
    if (!task) {
      throw new Error(`Metadata Update Failed: Task ID "${taskId}" not found.`);
    }

    if (metadata.planner_version !== undefined) {
      task.planner_version = metadata.planner_version;
    }
    if (metadata.context_policy_version !== undefined) {
      task.context_policy_version = metadata.context_policy_version;
    }
    if (metadata.verification_policy_version !== undefined) {
      task.verification_policy_version = metadata.verification_policy_version;
    }
    if (metadata.reflection_version !== undefined) {
      task.reflection_version = metadata.reflection_version;
    }

    task.updatedAt = new Date().toISOString();
  }

  /**
   * Records a phase change or action event in the execution timeline.
   */
  public recordTimelineEvent(
    taskId: string,
    phase: "planning" | "context building" | "routing" | "verification" | "reflection" | "completion",
    status: "started" | "completed" | "failed",
    durationMs?: number,
    metadata?: Record<string, any>
  ): void {
    const task = this.tasksMap.get(taskId);
    if (!task) return;

    if (!task.timeline) {
      task.timeline = [];
    }

    task.timeline.push({
      phase,
      timestamp: new Date().toISOString(),
      status,
      durationMs,
      metadata
    });

    task.updatedAt = new Date().toISOString();
  }

  /**
   * Safely fetches a deep-copy of the target task's current state.
   * Returns null if task ID does not exist in registry.
   * @param taskId Unique task reference key
   */
  public getTaskState(taskId: string): TaskState | null {
    const task = this.tasksMap.get(taskId);
    if (!task) {
      return null;
    }
    return this.clone(task);
  }

  /**
   * Lists all task records tracked in memory, sorted by creation timestamp descending.
   */
  public listTasks(): TaskState[] {
    const tasks = Array.from(this.tasksMap.values());
    
    // Sort descending by creation timestamp
    tasks.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return this.clone(tasks);
  }

  /**
   * Deletes a task from the state store to free memory.
   * @param taskId Unique task reference key
   * @returns true if task was found and deleted, false otherwise
   */
  public deleteTask(taskId: string): boolean {
    return this.tasksMap.delete(taskId);
  }
}
