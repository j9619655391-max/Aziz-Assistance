# 📐 Aziz Kernel (Sprint 5) - Implementation Report

This report outlines the implementation details and engineering patterns deployed for the **Deterministic Task Planner (Phase 3.0)** in the Aziz Kernel. The implementation was completed exactly in accordance with the frozen architecture guidelines and design specs.

---

## 1. Technical Architecture & Flow

The `Planner` is a lightweight, synchronous, zero-dependency engine. It maps plain-text goal directions against active tool configurations using deterministic heuristic matching, compiling them into a linear sequence of type-safe `TaskStep` structures.

```
                      ┌────────────────────────┐
                      │      Goal String       │
                      └───────────┬────────────┘
                                  │
                                  ▼
┌─────────────────┐       ┌──────────────┐       ┌─────────────────┐
│  Tool Registry  │──────►│   Planner    │◄──────│Workspace Context│
│  (listTools())  │       └──────┬───────┘       │ (symbolsGraph)  │
└─────────────────┘              │               └─────────────────┘
                                 ├────────────────────────┐
                                 ▼                        ▼
                       ┌──────────────────┐     ┌──────────────────┐
                       │    Event Bus     │     │   TaskStep[]     │
                       │ (PlanningEvents) │     │ (Status:pending) │
                       └──────────────────┘     └──────────────────┘
```

### Deterministic Heuristic Flow:
1. **Input Verification**: Prevents malformed runs by checking parameter limits (non-empty `taskId` and `goal`).
2. **Cycle Checking**: Validates whether there are any circular imports or dependencies inside `context.symbolsGraph` (DFS-based detection).
3. **Requirement Extraction**: Checks the goal string for explicit tool tags (e.g. `requires tool: calculator` or `tool: system_lint_audit`) or standard capabilities.
4. **Step Sequences Assembly**:
   - For mathematical goals, it forms steps utilizing `calculator` tool bindings.
   - For SRE lint/auditing goals, it links task steps to `system_lint_audit` tool bindings.
   - For generic goals, it maps any matching tool IDs or names mentioned in the goal text.
5. **Event Emission**: Stream-notifies the `IEventBus` using standard `PlanningStarted` and `PlanningCompleted` event envelopes.

---

## 2. Interface Definition & Implementation

The module strictly implements `IPlanner` from `/src/kernel/types.ts`:

```typescript
export interface IPlanner {
  createPlan(taskId: string, goal: string, context: WorkspaceContext): Promise<TaskStep[]>;
}
```

### Code Separation:
* **Planner Class**: Inside `/src/kernel/Planner.ts`. It contains clean input guards, dependency injection mappings, helper cycle detectors, and deterministic step matching logic.
* **Error Catalog**:
  - `InvalidGoalError`: Raised on empty/null input parameters.
  - `MissingCapabilityError`: Raised when explicit goals require missing capabilities.
  - `CircularPlanError`: Raised on circular dependency loops detected inside context graphs.

---

## 3. Core Constraints & Boundaries Verification

To protect the integrity of the runtime, we validated that the Planner satisfies the following strict restrictions:
* **No Side-Effects**: The Planner is purely functional and transactionally isolated. It never writes directly to the `IStateStore` (the orchestrator/runtime manages transitions).
* **No Direct LLM Calls**: Operates fully deterministically without requiring any external cloud LLM connections or prompt-generation latency.
* **No File Mutations**: The workspace directory remains untouched; file systems are only queried read-only via injected static context structures.
* **No Autonomous Loops**: Executes synchronously in a single compile pass without executing tools, spawning background timers, or running unmonitored cycles.
