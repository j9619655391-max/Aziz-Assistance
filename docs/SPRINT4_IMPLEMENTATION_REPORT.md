# 📐 Aziz Kernel (Phase 2) - Sprint 4 Implementation Report

This report outlines the detailed architecture, file structures, and code design choices of the **Aziz Kernel Agent Runtime (Sprint 4)**. This subsystem handles safe Agent registrations, isolated execution contexts, reactive lifecycle tracking, task cancellations, timeout gatekeepers, and deep telemetry integrations.

---

## 1. Architectural Blueprint & File Layout

The Agent Runtime is implemented as a highly disciplined, backward-compatible module under `/src/kernel`. It isolates agent workspace memory states, exposes programmatic lifecycles, and integrates securely with our existing state and event spines.

* **Interface Contract**: Defined in `/src/kernel/types.ts` (`IAgentRuntime`)
* **Concrete Class**: `/src/kernel/AgentRuntime.ts` (`AgentRuntime`)
* **Unit Tests**: `/src/kernel/tests/AgentRuntime.test.ts` (10 test cases covering registration, context runs, failures, cancellations, and timeouts - 100% pass)
* **Validation Performance Suite**: `/src/kernel/tests/AgentRuntimeValidation.ts`

---

## 2. Core Subsystems & Design Choices

### A. Non-Overlapping Isolation and Manifest Gating
To register an agent, the system conducts rigorous structural checks via `registerAgent`:
* Validates type integrity of `id`, `name`, and `maxExecutionTimeMs`.
* Rejects duplicate registrations or malformed manifest objects with custom `AgentRegistrationError` diagnostic traces.
* Deep-copies manifests to prevent external caller modifications of the active running registry.

### B. Execution Context Gating & Step hooks
During task execution (`executeTask`), an ephemeral `AgentExecutionContext` is injected into the handler:
* **Context Isolation**: Exposes only safe references to the task ID, plaintext goal, and step arrays.
* **Granular Logs**: Exposes a `.log()` method to dispatch real-time progress events (`"AgentExecutionProgress"`) onto the Event Bus.
* **Step-Level Hooks**: Provides `.recordStepCompleted()` and `.recordStepFailed()` handlers. These update specific DAG step statuses inside the State Store atomically, logging duration counters and incremental execution logs.
* **Telemetry Hooks**: Provides `.recordTelemetry()` to atomically update task token counts and USD costs in the State Store.

### C. State Machine Transition Compliance
To enforce absolute conformity with the strict state machine transitions in `InMemoryStateStore`, `AgentRuntime` intercepts the current status of the task and plays it through legal channels:
1. **Startup Transitions**:
   - If the task is `pending`, it transitions `pending -> planning -> running` sequentially.
   - If the task is already `planning`, it transitions `planning -> running`.
2. **Success Transitions**:
   - Moves the task securely through the sequence: `running -> verification -> reflection -> completed`.
3. **Failure Transitions**:
   - Moves the task directly from `running` (or `planning`) to `failed`.

This allows the Agent Runtime to run successfully without requiring structural or logical alterations to the preexisting `StateStore` state transition rules.

### D. Manual Cancellation Lifecycles
Execution cancellation is built directly into the runtime through standard HTML5 `AbortController` primitives:
* Invoking `cancelTask(taskId)` pulls the associated `AbortController` from our active tracker and calls `.abort()`.
* The runner wrapper intercepts the abort signal and immediately throws a custom `CancellationException`.
* This rejects the active runner promise, transitions the task status to `failed` (tracking its internal status as `cancelled`), updates cancellation telemetry indices, and publishes an `"AgentExecutionCancelled"` event trace.

### E. Absolute Timeout Gatekeepers
To prevent execution freezes or hanging asynchronous loops, every execution is raced against an absolute timer matching `manifest.maxExecutionTimeMs`:
* A fast-path Node.js `setTimeout` is scheduled alongside the runner handler.
* Exceeding the timeout limit triggers `controller.abort()`, sets the execution status to `"timed_out"`, and throws a custom `TimeoutException`.
* The runtime intercepts this, transitions the state store task to `failed`, records the timeout internally, and publishes `"AgentExecutionTimedOut"` to the Event Bus.
* A specific guard in the abort listener prevents race overlap: if the task is already marked `"timed_out"`, the listener avoids throwing `CancellationException`, letting the primary `TimeoutException` win the race and propagate clearly.

---

## 3. Key Implementation References

### Compliance State-Machine Transitions
```typescript
if (taskState.status === "pending") {
  this.stateStore.updateTaskStatus(taskId, "planning");
}
const currentTaskState = this.stateStore.getTaskState(taskId)!;
if (currentTaskState.status === "planning") {
  this.stateStore.updateTaskStatus(taskId, "running");
}
this.executionStatus.set(taskId, "running");
```

### Non-overlapping Timeout/Abort Race Wrapper
```typescript
controller.signal.addEventListener("abort", () => {
  if (this.executionStatus.get(taskId) === "timed_out") {
    return; // Let the timeout promise handle the rejection
  }
  reject(new CancellationException("AgentExecutionCancelled"));
});
```

---

## 4. Technical Debt Records

1. **Minimal Schema Validator v1**: The JSON Schema validator inside `InMemoryToolRegistry` is classified as "Minimal Schema Validator v1". It is intentionally limited to primitive and simple compound structures, and may be refactored or swapped with standard validators if advanced validation features (e.g. `$ref`, `allOf`, `anyOf`, conditional schemas) are required.
2. **Tool Registry Monolithic Structure**: We must monitor the growth of `ToolRegistry.ts`. If its roles (manifest verification, recursive schema validation, permissions audits, retry and timeout execution loops) expand further, we will refactor it into dedicated `ManifestValidation`, `PermissionEngine`, and `ExecutionPolicy` modules.
3. **Agent Runtime Sequential Transitioning**: The sequential transition stepping (e.g., `running -> verification -> reflection -> completed`) in `AgentRuntime` perfectly adapts to the rigid transition constraints of `StateStore.ts` for this sprint. In future phases with custom planners or verification engines, these transitions will be governed dynamically rather than sequentially simulated by the runtime.

---

## 5. Sprint 4 Scope Adherence Checklist

* **IAgentRuntime implementation** ➡️ **COMPLETE** (in `/src/kernel/AgentRuntime.ts`)
* **Agent lifecycle management** ➡️ **COMPLETE** (`getExecutionStatus()`, status states: running, completed, failed, cancelled, timed_out)
* **Agent registration** ➡️ **COMPLETE** (`registerAgent()`, manifest-checking)
* **Agent execution context** ➡️ **COMPLETE** (`AgentExecutionContext` with log, telemetry, and step recorders)
* **Agent cancellation** ➡️ **COMPLETE** (`cancelTask()` via standard `AbortController` cancellation)
* **Agent timeout handling** ➡️ **COMPLETE** (`maxExecutionTimeMs` timer racing with abort guards)
* **Runtime telemetry** ➡️ **COMPLETE** (aggregated runtime telemetry tracking executions, successes, failures, cancellations, timeouts, durations, and resources)
* **Runtime event publication** ➡️ **COMPLETE** (dispatches `AgentRegistered`, `AgentExecutionStarted`, `AgentExecutionProgress`, `AgentExecutionCompleted`, `AgentExecutionFailed`, `AgentExecutionCancelled`, and `AgentExecutionTimedOut` events)
* **Integration with State Store and Event Bus only** ➡️ **COMPLETE** (no Planner, Context Builder, Reflection, or Verification engines introduced, ensuring zero unauthorized feature bleed)
* **Unit tests** ➡️ **COMPLETE** (10 sequential unit tests in `/src/kernel/tests/AgentRuntime.test.ts`)
* **Validation suite** ➡️ **COMPLETE** (benchmark metrics in `/src/kernel/tests/AgentRuntimeValidation.ts`)
