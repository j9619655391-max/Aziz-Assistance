# Aziz Kernel v1.0 Event Catalog

This document catalogues all event schemas dispatched across the centralized `InMemoryEventBus` spine. It specifies trigger conditions, complete TypeScript interfaces for payloads, and downstream system effects.

---

## 1. Event Envelope Structure (`KernelEvent`)

Every event published to the Event Bus is wrapped in a standardized envelope.

```typescript
export interface KernelEvent {
  /** Unique UUID or sequence tracking ID for this event instance */
  eventId: string;
  /** Timestamp of dispatch in RFC 3339 format */
  timestamp: string;
  /** Task associated with this event */
  taskId: string;
  /** Name/Type of the event */
  type: KernelEventType | string;
  /** Context-specific parameter dictionary */
  payload: Record<string, any>;
}
```

---

## 2. Comprehensive Event Registry

Below is the exhaustive catalog of frozen event schemas. No payload structures or types may be changed without a version increment.

---

### Event: `TaskCreated`

* **Trigger Source**: Dispatched by the orchestrator or state store whenever a new user-requested task is initialized.
* **Semantic Meaning**: A new goal has entered the system queue and is ready for planning.
* **Payload Schema**:
```typescript
interface TaskCreatedPayload {
  /** The plain text user goal or prompt */
  goal: string;
  /** Timestamp of initialization */
  createdAt: string;
}
```

---

### Event: `PlanningStarted`

* **Trigger Source**: Dispatched by `Planner` or `AgentRuntime` immediately prior to invoking the planning LLM request.
* **Semantic Meaning**: The system is assembling workspace context to build an execution plan.
* **Payload Schema**:
```typescript
interface PlanningStartedPayload {
  /** Target task goal being planned */
  goal: string;
  /** Files supplied to the context builder */
  impactedFiles: string[];
}
```

---

### Event: `PlanningCompleted`

* **Trigger Source**: Dispatched by `Planner` upon successfully generating the structured task execution plan.
* **Semantic Meaning**: The DAG steps have been verified and loaded into the task state queue.
* **Payload Schema**:
```typescript
interface PlanningCompletedPayload {
  /** Total number of generated steps */
  stepsCount: number;
  /** Version of the planner module used */
  planner_version: string;
  /** Brief summary representation of each step */
  stepsSummary: Array<{
    id: string;
    name: string;
    status: "pending" | "running" | "completed" | "failed";
    toolId?: string;
  }>;
}
```

---

### Event: `ToolExecuted`

* **Trigger Source**: Dispatched by `ToolRegistry` or `AgentRuntime` immediately after a tool has finished executing.
* **Semantic Meaning**: An environment boundary was crossed, and file-system or process actions have taken place.
* **Payload Schema**:
```typescript
interface ToolExecutedPayload {
  /** Unique identifier of the tool */
  toolId: string;
  /** Arguments passed into the tool */
  arguments: Record<string, any>;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Estimated byte size of the return payload if successful */
  outputSize?: number;
  /** Errant message if the tool crashed */
  error?: string;
}
```

---

### Event: `VerificationPassed`

* **Trigger Source**: Dispatched by the `VerificationEngine` when all automated test and validation checks succeed.
* **Semantic Meaning**: The active changes adhere to workspace boundaries and syntax correctness rules.
* **Payload Schema**:
```typescript
interface VerificationPassedPayload {
  /** Total duration of verification in milliseconds */
  durationMs: number;
  /** Metrics collected during rule execution */
  telemetry: {
    passedRules: number;
    failedRules: number;
    errorsCount: number;
    warningsCount: number;
  };
  /** Policy version used during checks */
  verification_policy_version: string;
  /** Concise scorecard breakdown */
  reportSummary: Array<{
    id: string;
    passed: boolean;
    severity: "low" | "medium" | "high";
  }>;
}
```

---

### Event: `VerificationFailed`

* **Trigger Source**: Dispatched by the `VerificationEngine` if any validation or compilation rule fails.
* **Semantic Meaning**: The code modifications breached safe execution conditions (e.g., compile error or leaked credential).
* **Payload Schema**:
```typescript
interface VerificationFailedPayload {
  /** Total duration of verification in milliseconds */
  durationMs: number;
  /** Array of specific error strings */
  errors: string[];
  /** Policy version used during checks */
  verification_policy_version: string;
}
```

---

### Event: `CheckpointCreated`

* **Trigger Source**: Dispatched by the runtime state or rollback manager before initiating a multi-step mutation.
* **Semantic Meaning**: A snapshot of current file-system contents is recorded to allow full recovery in the event of failure.
* **Payload Schema**:
```typescript
interface CheckpointCreatedPayload {
  /** Unique checkpoint identifier */
  checkpointId: string;
  /** Paths snapshotting is applied to */
  filePaths: string[];
}
```

---

### Event: `RollbackTriggered`

* **Trigger Source**: Dispatched by the runtime state or fallback mechanism upon encountering a critical verification or agent loop error.
* **Semantic Meaning**: File system mutations are being reversed to restore the previous stable checkpoint state.
* **Payload Schema**:
```typescript
interface RollbackTriggeredPayload {
  /** Checkpoint identifier being restored */
  checkpointId: string;
  /** Error cause that forced the rollback action */
  error: string;
}
```

---

### Event: `TaskCompleted`

* **Trigger Source**: Dispatched by the `AgentRuntime` orchestrator upon entering a terminal status.
* **Semantic Meaning**: The orchestration loop has completed.
* **Payload Schema**:
```typescript
interface TaskCompletedPayload {
  /** Unique registration identifier of the executing agent */
  agentId: string;
  /** Indicates if the goal was successfully achieved */
  success: boolean;
  /** Error message if the run failed */
  error?: string;
  /** Explicitly marks if execution was manually aborted */
  cancelled?: boolean;
  /** Explicitly marks if execution was terminated due to timeout bounds */
  timedOut?: boolean;
}
```

---

## 3. Wildcard Subscription Map

Subscribers are allowed to bind to explicit types or use the `"*" ` wildcard channel.

```
                         [Event Bus Spine]
                                 │
           ┌─────────────────────┼─────────────────────┐
           ▼                     ▼                     ▼
      [LoggerSub]          [DashboardSub]        [AnalyticsSub]
     Channel: "*"        Channel: "ToolExecuted" Channel: "TaskCompleted"
```

* **LoggerSub**: Binds to `"*"` to write structured JSON files detailing every stage transition to log dumps.
* **DashboardSub**: Binds to `"ToolExecuted"` or `"TaskCompleted"` to update real-time visual progress bars.
* **AnalyticsSub**: Binds to `"TaskCompleted"` to compute and save runtime financial and token stats.
