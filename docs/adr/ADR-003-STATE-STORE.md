# Architecture Decision Record (ADR-003): Stateful State Store & Telemetry Tracker

## Context & Problem Statement
In Phase 1, task execution records were mostly transient, living within local request-response streams. To build robust SRE agents that can perform multi-hour, multi-step engineering assignments, we need a centralized state machine that tracks active tasks, retry loops, individual sub-step durations, model latencies, token consumption, and fallback counts. Without this stateful store, we cannot provide real-time dashboards or accurately calculate the exact execution cost of autonomous jobs.

## Decision
We will design and implement a centralized **State Store** within the Aziz Kernel. The State Store will subscribe to events on the Event Bus to construct and update real-time records of active task statuses, individual step durations, and LLM telemetry. 

The Store will initially hold data in-memory and write periodic JSON checkpoints to the filesystem, ready to be mounted onto Firestore for multi-user/durable environments.

### Core Domain Interfaces
```typescript
export interface TaskStep {
  stepId: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  durationMs?: number;
  errorMessage?: string;
}

export interface TaskTelemetry {
  totalTokensIn: number;
  totalTokensOut: number;
  estimatedCostUsd: number;
  retriesCount: number;
  fallbacksUsed: string[];
  executionTimeMs: number;
}

export interface TaskState {
  taskId: string;
  goal: string;
  status: "Pending" | "Planning" | "Running" | "Verification" | "Completed" | "Failed";
  currentAgent: string | null;
  currentStepIndex: number;
  steps: TaskStep[];
  telemetry: TaskTelemetry;
}

export interface IStateStore {
  createTask(goal: string): string; // returns taskId
  updateStep(taskId: string, stepId: string, updates: Partial<TaskStep>): void;
  recordTelemetry(taskId: string, usage: Partial<TaskTelemetry>): void;
  getTaskState(taskId: string): TaskState | null;
  listTasks(): TaskState[];
}
```

## Consequences
- **Positive**: Complete real-time visibility into the agent's internal state.
- **Positive**: Enables automated cost intelligence by multiplying model token rates by token usage counters.
- **Negative**: Requires precise lock management or atomic state-mutator calls to prevent memory leaks or race conditions during rapid event arrivals.

## Acceptance Criteria
- [ ] Creates a thread-safe dictionary of active task states.
- [ ] Formally counts and sums token consumption across all models.
- [ ] Automatically updates individual step statuses and calculates durations using precise monotonic millisecond timers (`process.hrtime` or `Date.now()`).
- [ ] Exposes a clean API endpoint (`/api/kernel/tasks/:id`) to query the exact status and telemetry.
