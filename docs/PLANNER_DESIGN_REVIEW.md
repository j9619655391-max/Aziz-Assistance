# 📐 Aziz Kernel (Phase 3.0) - Planner Design Review

This document presents the contract review and design specifications for the **Deterministic Task Planner (Phase 3.0)**. In accordance with strict architectural discipline, this phase introduces no new global architecture changes or auxiliary directories. It defines the formal interfaces, interactions, state machine mechanics, and failure handling policies for the `Planner` module.

The Planner remains a **deterministic, non-autonomous planning worker** with the single responsibility of translating a plain-text goal and workspace context into an ordered list of executable task steps.

---

## 1. Planner Responsibilities

The Planner has exactly **one** responsibility:
* **Plan Formulation**: Transforming an input task goal and a static workspace snapshot into an ordered sequence of discrete `TaskStep` structures that the orchestration runtime can execute sequentially.

### Strict Negative Constraints (What the Planner MUST NOT Do)
To prevent agentic feedback loops, environment escapes, and execution leakage, the Planner is bound by the following negative rules:
1. **No Tool Execution**: The Planner must never execute, call, or trigger tools.
2. **No Direct LLM/External Calls**: The Planner must not invoke external LLMs, API endpoints, or third-party reasoning model providers directly. (It relies on deterministic rule parsing, capability matching, or clean routing).
3. **No File Modification**: The Planner has read-only access to files and contexts. It must never create, edit, or delete workspace files or directories.
4. **No Autonomous Loops**: The Planner is a synchronous/single-invocation compiler of plans. It does not monitor execution, loop on feedback, or autonomously re-plan without external orchestrator triggering.

---

## 2. Planner Inputs

The Planner receives three structured arguments when invoked via `createPlan`:

```typescript
async createPlan(taskId: string, goal: string, context: WorkspaceContext): Promise<TaskStep[]>;
```

| Input Argument | TypeScript Type | Contractual Details & Constraints |
| :--- | :--- | :--- |
| `taskId` | `string` | Must be a valid, state-store-registered task ID starting with the prefix `task_`. |
| `goal` | `string` | The plain text execution directive provided by the user (non-empty). |
| `context` | `WorkspaceContext` | A static snapshot of the workspace files, symbols, and compressed summaries. |

---

## 3. Planner Outputs

The Planner outputs a promise resolving to a type-safe array of execution steps:

```typescript
Promise<TaskStep[]>
```

Each returned `TaskStep` must satisfy the following strict requirements:
* **Unique logical ID**: A unique `stepId` mapped deterministically to the sequence (e.g., `step_0`, `step_1`).
* **Deterministic Status**: Every generated step must start in the `"pending"` state.
* **Targeted Tool Association**: If a step requires tool execution, its `toolId` property must align with a valid, registered tool cataloged in the `ToolRegistry`.
* **Clean Trace Boundaries**: The `logs` array must be initialized to empty `[]`, and the `error` property must be undefined.

---

## 4. State Transitions

The Planner operates strictly during the transitional boundary between task initiation and runner execution. The state changes are managed transactionally within the `IStateStore`:

```
 [State Store]        [Agent Runtime / Orchestrator]        [Planner]
      │                              │                          │
      ├──────(Task Created)─────────►│                          │
      │   (Status: "pending")        │                          │
      │                              ├───────(Invoke)──────────►│
      │◄───(Transition: "planning")──┤                          │
      │                              │◄──────(TaskStep[])───────┤
      │◄───(Transition: "running")───┤                          │
      ▼                              ▼                          ▼
```

### Transition Steps:
1. **Transition 1 (`pending` ➔ `planning`)**:
   * Triggered by the Orchestrator inside the `IStateStore` immediately before invoking the Planner.
   * Lockout rule: Prevents other runner loops from selecting this task while planning is in progress.
2. **Transition 2a (Successful Plan: `planning` ➔ `running`)**:
   * Occurs after the Planner returns a valid `TaskStep[]` list.
   * The Orchestrator registers the generated steps in the state store and transitions the main status to `"running"` to start execution.
3. **Transition 2b (Failed Plan: `planning` ➔ `failed`)**:
   * Triggered if the Planner throws an exception (e.g., capability mismatch, invalid syntax).
   * The Orchestrator intercepts the error, logs the failure stack trace to the task state, and transitions the main status to `"failed"`.

---

## 5. Events Emitted

To support real-time logging, auditability, and telemetry streaming, the planning process publishes specific event envelopes to the `IEventBus`:

### A. `PlanningStarted`
* **Trigger**: Dispatched immediately when planning begins.
* **Payload Structure**:
  ```json
  {
    "taskId": "task_12345678",
    "type": "PlanningStarted",
    "payload": {
      "goal": "Verify system configurations and run standard tests"
    }
  }
  ```

### B. `PlanningCompleted`
* **Trigger**: Dispatched upon successful plan creation and step formulation.
* **Payload Structure**:
  ```json
  {
    "taskId": "task_12345678",
    "type": "PlanningCompleted",
    "payload": {
      "stepsCount": 3,
      "stepsSummary": [
        { "id": "step_0", "name": "Scan config files", "toolId": "file_reader" },
        { "id": "step_1", "name": "Run linter", "toolId": "terminal_lint" },
        { "id": "step_2", "name": "Aggregate audit log", "toolId": null }
      ]
    }
  }
  ```

---

## 6. Events Consumed

The Planner itself is a stateless, pure execution unit. It **does not actively subscribe to or consume events** from the `IEventBus` during its operation. This design prevents side-effects and race conditions, ensuring that planning is fully synchronous and isolated.

---

## 7. Interaction with Other Modules

The Planner interacts with the core stack via tight, clean boundaries:

```
                            ┌────────────────┐
                            │  Agent Runtime │
                            └───────┬────────┘
                                    │ Invokes
                                    ▼
┌──────────────┐ Read Only  ┌────────────────┐  Register Steps ┌──────────────┐
│ ToolRegistry │◄───────────┤    Planner     ├───────────────►│  State Store │
└──────────────┘            └───────┬────────┘                └──────────────┘
                                    │ Emits Events
                                    ▼
                            ┌────────────────┐
                            │    Event Bus   │
                            └────────────────┘
```

* **State Store (`IStateStore`)**:
  * **Read-Only Context**: The Planner reads current task state variables and goal definitions.
  * **No Direct Writes**: To guarantee determinism and logical isolation, the Planner does not write directly to the State Store. Plan storage and state machine transitions are coordinated exclusively by the Orchestrator (`AgentRuntime`).
* **Event Bus (`IEventBus`)**:
  * The Planner uses the Event Bus to publish lifecycle markers (`PlanningStarted`, `PlanningCompleted`).
* **Tool Registry (`IToolRegistry`)**:
  * The Planner calls `listTools()` on the Tool Registry to fetch the currently active set of capabilities, risk profiles, and schemas.
  * It maps task requirements against available tools to resolve which steps require automated tool invocation (mapping appropriate steps to `toolId`).
* **Agent Runtime (`IAgentRuntime`)**:
  * The Agent Runtime acts as the master driver, calling `createPlan` once the task enters the active queue, handling returned step sequences, and managing error recovery.

---

## 8. Failure Handling

Planning can fail due to environment or logical constraints. The Planner resolves failures gracefully:

1. **Invalid Input Guard**:
   * If the input goal is empty or null, the Planner immediately throws an `InvalidGoalError`.
2. **Capability Resolution Failure**:
   * If the goal explicitly requests a specific tool capability that does not exist in the current `ToolRegistry` (e.g., "Run SRE benchmark check" when no matching SRE tool exists), the Planner throws a `MissingCapabilityError`.
3. **Circular Reference Guard**:
   * In future multi-step DAG planners, if steps declare dependencies, the Planner must validate the sequence against circular dependencies, failing fast with a `CircularPlanError`.

---

## 9. Retry Strategy

Because the Planner is deterministic, retrying a planning request with identical inputs, identical workspace contexts, and identical Tool Registry states will produce the exact same outcome.
* **No Direct Busy-Loop Retry**: The Planner will not retry its own planning logic.
* **Orchestrator Responsibility**: If planning fails, the Orchestrator marks the task as `"failed"`. A retry is only logical if initiated by the user (updating the goal) or if the environment changes (e.g., registering missing tools into the `ToolRegistry`).

---

## 10. Acceptance Criteria

The Planner implementation will be verified against the following strict tests:

1. **E2E Integration Verification**:
   * Must successfully translate a math goal into a structured plan containing steps associated with the math tool (`toolId: "calculator"`).
2. **Status Correctness**:
   * All returned steps must be initialized strictly with `status = "pending"`, an empty `logs` array, and undefined errors.
3. **Schema Adherence**:
   * The output array must conform 100% to the `TaskStep[]` schema defined in `src/kernel/types.ts`.
4. **State Transition Validation**:
   * The Orchestrator must correctly move the task status from `pending -> planning` before execution and `planning -> running` post-execution.
5. **Event Delivery Verification**:
   * The Event Bus must record matching `PlanningStarted` and `PlanningCompleted` events with valid payloads and matching `taskId` references.
