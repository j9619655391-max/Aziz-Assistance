/**
 * @file /src/kernel/types.ts
 * @description Centralized type declarations, event contracts, and interfaces for the Aziz Kernel.
 * Enforces strict boundaries and strict typescript-safety.
 */

/**
 * Valid statuses for a complete task state machine.
 */
export type TaskStatus = 
  | "pending" 
  | "planning" 
  | "running" 
  | "verification" 
  | "reflection" 
  | "completed" 
  | "failed";

/**
 * Valid statuses for an individual task step.
 */
export type StepStatus = "pending" | "running" | "completed" | "failed";

/**
 * Event types dispatched across the event bus spine.
 */
export type KernelEventType =
  | "TaskCreated"
  | "PlanningStarted"
  | "PlanningCompleted"
  | "ToolExecuted"
  | "VerificationPassed"
  | "VerificationFailed"
  | "CheckpointCreated"
  | "RollbackTriggered"
  | "TaskCompleted";

/**
 * Structure of a single KernelEvent envelope.
 */
export interface KernelEvent {
  /** Unique UUID or sequence tracking ID for this event instance */
  eventId: string;
  /** Timestamp of dispatch in RFC 3339 format */
  timestamp: string;
  /** Task associated with this event */
  taskId: string;
  /** Name/Type of the event as cataloged */
  type: KernelEventType | string;
  /** Context-specific parameter dictionary */
  payload: Record<string, any>;
  /** Optional structured request ID for trace propagation */
  requestId?: string;
}

/**
 * Structure of a single task step inside the execution DAG.
 */
export interface TaskStep {
  /** Unique sequence or logical key for the step */
  stepId: string;
  /** Human-readable short name describing step goal */
  name: string;
  /** Execution status */
  status: StepStatus;
  /** Elapsed running duration in milliseconds if completed */
  durationMs?: number;
  /** Incremental output logs accumulated during execution */
  logs?: string[];
  /** Error stack trace or message if execution failed */
  error?: string;
  /** Optional tool ID referenced by this step */
  toolId?: string;
}

/**
 * Metric tracking counters for task runtime analytics.
 */
export interface TaskTelemetry {
  /** Total tokens (prompt + completion) consumed */
  tokensUsed: number;
  /** Prompt token allocation */
  promptTokens: number;
  /** Generated token allocation */
  completionTokens: number;
  /** Running financial cost estimated in USD */
  costInUSD: number;
  /** Runtime execution duration in milliseconds */
  durationMs: number;
  /** Directory of tool execution counts keyed by tool ID */
  toolInvocations: Record<string, number>;
}

/**
 * Safe transaction-isolated task state report.
 */
export interface TaskState {
  /** Unique UUID assigned to the task */
  taskId: string;
  /** Goal string input by user */
  goal: string;
  /** Active status in state machine */
  status: TaskStatus;
  /** DAG/ordered sequence array of executable steps */
  steps: TaskStep[];
  /** Consolidated runtime telemetry metrics */
  telemetry: TaskTelemetry;
  /** Creation timestamp in RFC 3339 format */
  createdAt: string;
  /** Last update timestamp in RFC 3339 format */
  updatedAt: string;
  /** Standardized version tracking metadata */
  planner_version?: string;
  context_policy_version?: string;
  verification_policy_version?: string;
  reflection_version?: string;
  /** Chronological history of execution phases */
  timeline?: TaskTimelineEvent[];
}

export interface TaskTimelineEvent {
  phase: "planning" | "context building" | "routing" | "verification" | "reflection" | "completion";
  timestamp: string;
  durationMs?: number;
  status: "started" | "completed" | "failed";
  metadata?: Record<string, any>;
}

/**
 * Declares capability limits and schemas to prevent environment escapes.
 */
export interface ToolManifest {
  /** Unique tool identifier name */
  id: string;
  /** Human-friendly name */
  name: string;
  /** Functional description */
  description: string;
  /** Permissions required by runner */
  permissions: string[];
  /** Risk classification boundary */
  riskLevel: "low" | "medium" | "high";
  /** Absolute script timeout limit in milliseconds */
  timeoutMs: number;
  /** Maximum retry attempts allowed on failure */
  maxRetries: number;
  /** Formal JSON Schema validating input arguments */
  inputSchema: Record<string, any>;
  /** Expected structured shape of tool responses */
  outputSchema: Record<string, any>;
}

/**
 * LLM Model router execution result container.
 */
export interface ModelResponse {
  /** Text content returned by the LLM model */
  content: string;
  /** Consolidated token usage during call if tracked */
  tokensConsumed?: number;
  /** Running call latency in milliseconds */
  latencyMs?: number;
}

/**
 * Compressed workspace representation compiled by the context builder.
 */
export interface WorkspaceContext {
  /** Scanned and approved source workspace files */
  files: string[];
  /** Syntactically pruned symbols or summarized representations */
  compressedSummary?: string;
  /** Symbols dependency graph adjacency maps */
  symbolsGraph?: Record<string, any>;
  /** Standardized context compilation policy version */
  context_policy_version?: string;
}

/**
 * User system rule metadata stored inside the memory subsystems.
 */
export interface UserPreferenceMemory {
  id: string;
  type: "preference";
  category: "editor" | "sre" | "security";
  content: string;
  importance: number;
}

/**
 * Historical successful task resolutions persisted across restarts.
 */
export interface TaskExecutionMemory {
  id: string;
  type: "task_execution";
  goal: string;
  solutionSummary: string;
  filesModified: string[];
  tokensConsumed: number;
  failuresEncountered: string[];
  recencyTimestamp: string;
}

/**
 * Global guardrails enforced across all agent pipelines.
 */
export interface GlobalRuleMemory {
  id: string;
  type: "global_rule";
  content: string;
  enforceEverywhere: boolean;
}

/**
 * Interface 1: Asynchronous Event Bus spine routing execution messages.
 */
export interface IEventBus {
  /**
   * Dispatches a type-safe event frame out to all matched listeners.
   * Automatically appends a unique event ID and current RFC 3339 timestamp.
   * @param event Frame input parameters excluding autogenerated fields
   */
  publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void;

  /**
   * Subscribes a listener to trigger when a matching event occurs.
   * Wildcard "*" channel matches every dispatched event.
   * @param type Targeted event type or "*" wildcard
   * @param handler Unhandled-safe callback handler
   */
  subscribe(type: KernelEventType | "*", handler: (event: KernelEvent) => void): void;
}

/**
 * Interface 2: Centralized, memory-based, transactional task state database.
 */
export interface IStateStore {
  /**
   * Initializes a new task state entry in memory.
   * Sets up default telemetry matrices and empty step queues.
   * @param goal The plain text goal describing target end-state
   * @returns Uniquely generated UUID string identifying the task
   */
  createTask(goal: string): string;

  /**
   * Transactionally updates the parent status of a task.
   * Blocks impossible or invalid state transitions to ensure machine safety.
   * @param taskId Unique identifier for target task
   * @param status Next state in transition matrix
   */
  updateTaskStatus(taskId: string, status: TaskStatus): void;

  /**
   * Partially modifies an individual execution step inside the task queue.
   * @param taskId Unique identifier for parent task
   * @param stepId Unique logical identifier for target step
   * @param updates Object containing modifications
   */
  updateStep(taskId: string, stepId: string, updates: Partial<TaskStep>): void;

  /**
   * Atomically records incremental LLM token usage or tool execution metrics.
   * @param taskId Unique identifier for parent task
   * @param usage Metric values to increment/track
   */
  recordTelemetry(taskId: string, usage: Partial<TaskTelemetry>): void;

  /**
   * Safely fetches a deep-copy of the target task's current state.
   * Returns null if task ID does not exist in registry.
   * @param taskId Unique task reference key
   */
  getTaskState(taskId: string): TaskState | null;

  /**
   * Optionally updates standardized module version metadata for the task.
   */
  updateTaskMetadata?(
    taskId: string,
    metadata: {
      planner_version?: string;
      context_policy_version?: string;
      verification_policy_version?: string;
      reflection_version?: string;
    }
  ): void;

  /**
   * Records a phase change or action event in the execution timeline.
   */
  recordTimelineEvent?(
    taskId: string,
    phase: "planning" | "context building" | "routing" | "verification" | "reflection" | "completion",
    status: "started" | "completed" | "failed",
    durationMs?: number,
    metadata?: Record<string, any>
  ): void;

  /**
   * Lists all task records tracked in memory, sorted by creation timestamp descending.
   */
  listTasks(): TaskState[];

  /**
   * Deletes a task from the state store to free memory.
   * @param taskId Unique task reference key
   * @returns true if task was found and deleted, false otherwise
   */
  deleteTask(taskId: string): boolean;
}

/**
 * Interface 3: Machine-Readable Tool Capability Registry.
 */
export interface IToolRegistry {
  registerTool(manifest: ToolManifest, handler: (args: any) => Promise<any>): void;
  executeTool(toolId: string, args: Record<string, any>, taskId: string): Promise<any>;
  listTools(): ToolManifest[];
  getTool(toolId: string): ToolManifest | null;
}

/**
 * Interface 4: Policy-Driven LLM Model Router.
 */
export interface IModelRouter {
  generate(
    prompt: string, 
    policy: "fast" | "reasoning" | "bulk", 
    systemInstruction?: string
  ): Promise<ModelResponse>;
}

/**
 * Interface 5: 4-Layer Semantic Context Builder.
 */
export interface IContextBuilder {
  buildContext(query: string, impactedFiles: string[]): Promise<WorkspaceContext>;
}

/**
 * Interface 6: Non-Linear Task Planner.
 */
export interface IPlanner {
  createPlan(taskId: string, goal: string, context: WorkspaceContext): Promise<TaskStep[]>;
}

/**
 * Interface 7: Verification Gateway (DoD Gatekeeper).
 */
export interface IVerificationEngine {
  verify(taskId: string, filePaths: string[]): Promise<{
    success: boolean;
    logs: string[];
    errors: string[];
    verification_policy_version?: string;
  }>;
}

/**
 * Interface 8: LLM Reflection Critic.
 */
export interface IReflectionEngine {
  review(taskId: string, goal: string, result: string): Promise<{
    passed: boolean;
    reasoning: string;
    confidenceScore: number;
  }>;
}

/**
 * Interface 9: Core Orchestration Loop (Agent Runtime).
 */
export interface IAgentRuntime {
  executeTask(taskId: string): Promise<boolean>;
}
