# Aziz Kernel v1.0 Type Contract Reference

This document maps the complete set of type declarations, state machine models, metadata schemas, and configuration structures defined in `/src/kernel/types.ts`. These contracts are frozen under the v1.0 release protocol.

---

## 1. State Machine Definitions

### `TaskStatus`
Defines the absolute state boundaries of the task state machine.
```typescript
export type TaskStatus = 
  | "pending" 
  | "planning" 
  | "running" 
  | "verification" 
  | "reflection" 
  | "completed" 
  | "failed";
```

### `StepStatus`
Defines execution states of individual steps within the execution plan DAG.
```typescript
export type StepStatus = "pending" | "running" | "completed" | "failed";
```

---

## 2. Core Operational Entities

### `TaskStep`
Describes an individual node of execution.
```typescript
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
```

### `TaskState`
The complete, self-contained, serializable state record of a task.
```typescript
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
}
```

---

## 3. Telemetry & Analytics Models

### `TaskTelemetry`
Contains detailed runtime counters and metrics.
```typescript
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
```

---

## 4. Integration & Routing Contracts

### `ToolManifest`
Defines the safe execution boundaries and validation rules for third-party tools.
```typescript
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
```

### `ModelResponse`
Container returned by LLM router interactions.
```typescript
export interface ModelResponse {
  /** Text content returned by the LLM model */
  content: string;
  /** Consolidated token usage during call if tracked */
  tokensConsumed?: number;
  /** Running call latency in milliseconds */
  latencyMs?: number;
}
```

### `WorkspaceContext`
The compressed contextual workspace compiled by the context builder.
```typescript
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
```

---

## 5. Memory & Contextual Persistence

### `UserPreferenceMemory`
Persisted profile configurations representing custom guidelines.
```typescript
export interface UserPreferenceMemory {
  id: string;
  type: "preference";
  category: "editor" | "sre" | "security";
  content: string;
  importance: number;
}
```

### `TaskExecutionMemory`
Persisted resolution outcomes used by the context builder for few-shot planning guidance.
```typescript
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
```

### `GlobalRuleMemory`
A global guardrail rule that is loaded by default into all runtime cycles.
```typescript
export interface GlobalRuleMemory {
  id: string;
  type: "global_rule";
  content: string;
  enforceEverywhere: boolean;
}
```
