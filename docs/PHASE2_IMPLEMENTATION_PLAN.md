# 📋 Aziz Kernel (Phase 2): Core Engine Implementation Plan

This document outlines the structured, sprint-by-sprint implementation backlog for the **Aziz Kernel (v2.0)** core engine. It ensures a stable, compiled repository state at every milestone and defines explicit test and delivery strategies prior to writing production code.

---

## 1. Incremental Dependency & Implementation Graph

To guarantee that no subsystem is developed prior to its dependencies, the implementation will follow an exact, sequential order:

```
[Types Contract Interface (Centralized)]
                 │
                 ▼
          [1. State Store] ◄─── (Tracks active statuses & token counts)
                 │
                 ▼
          [2. Event Bus]   ◄─── (Coordinates async event notifications)
                 │
                 ▼
        [3. Tool Registry] ◄─── (Validates JSON schema execution manifests)
                 │
                 ▼
         [4. Model Router] ◄─── (Orchestrates policy routing & API limits)
                 │
                 ▼
        [5. Context Builder] ◄─ (Traverses dependencies for token compression)
                 │
                 ▼
           [6. Planner]    ◄─── (Assembles goal execution DAG)
                 │
                 ▼
       [7. Reflection Engine] ◄ (Critiques generated changes)
                 │
                 ▼
      [8. Verification Engine] ◄ (Performs tsc/eslint/diagnostic runs)
                 │
                 ▼
        [9. Agent Runtime] ◄─── (Main orchestration transaction loop)
```

---

## 2. Interface Mapping Specification

All core engine structures are bound to centralized interfaces to preserve clean encapsulation and enable mock-driven testing.

| Abstract Interface (Source) | Concrete Implementation Class | File Path |
| :--- | :--- | :--- |
| **`IKernelTypes`** (N/A) | Central Shared Types Namespace | `/src/kernel/types.ts` |
| **`IStateStore`** | `InMemoryStateStore` | `/src/kernel/StateStore.ts` |
| **`IEventBus`** | `NodeEventBus` | `/src/kernel/EventBus.ts` |
| **`IToolRegistry`** | `SchemaToolRegistry` | `/src/kernel/ToolRegistry.ts` |
| **`IModelRouter`** | `PolicyModelRouter` | `/src/kernel/ModelRouter.ts` |
| **`IContextBuilder`** | `SymbolicContextBuilder` | `/src/kernel/ContextBuilder.ts` |
| **`IPlanner`** | `DAGPlanner` | `/src/kernel/Planner.ts` |
| **`IReflectionEngine`** | `LLMReflectionEngine` | `/src/kernel/ReflectionEngine.ts` |
| **`IVerificationEngine`** | `DoDVerificationEngine` | `/src/kernel/VerificationEngine.ts` |
| **`IAgentRuntime`** | `CoreAgentRuntime` | `/src/kernel/AgentRuntime.ts` |

---

## 3. File Creation Plan

Below is the list of all files that will be added to the workspace during Phase 2.

### 1. `/src/kernel/types.ts`
* **Purpose**: Central namespace defining core interfaces, schemas, types, and event catalogs.
* **Dependencies**: None.
* **Public Interfaces**: `KernelEvent`, `TaskState`, `TaskStep`, `TaskTelemetry`, `ToolManifest`, `IEventBus`, `IStateStore`, `IToolRegistry`, `IModelRouter`, `IContextBuilder`, `IPlanner`, `IReflectionEngine`, `IVerificationEngine`, `IAgentRuntime`.

### 2. `/src/kernel/StateStore.ts`
* **Purpose**: Safe, transaction-isolated, in-memory state register.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `InMemoryStateStore` (Implements `IStateStore`).

### 3. `/src/kernel/EventBus.ts`
* **Purpose**: Decoupled asynchronous communications broker wrapped around Node's event loop.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `NodeEventBus` (Implements `IEventBus`).

### 4. `/src/kernel/ToolRegistry.ts`
* **Purpose**: Secure manifest validator enforcing parameter constraints.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `SchemaToolRegistry` (Implements `IToolRegistry`).

### 5. `/src/kernel/ModelRouter.ts`
* **Purpose**: Dynamic policy-driven prompt router with automatic exponential backoffs.
* **Dependencies**: `/src/kernel/types.ts`, `@google/genai` SDK.
* **Public Interfaces**: `PolicyModelRouter` (Implements `IModelRouter`).

### 6. `/src/kernel/ContextBuilder.ts`
* **Purpose**: Traverses file dependency graphs to optimize token context sizes.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `SymbolicContextBuilder` (Implements `IContextBuilder`).

### 7. `/src/kernel/Planner.ts`
* **Purpose**: Generates non-linear task DAGs using the Model Router.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `DAGPlanner` (Implements `IPlanner`).

### 8. `/src/kernel/ReflectionEngine.ts`
* **Purpose**: Multi-agent self-criticism component evaluating proposed patches.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `LLMReflectionEngine` (Implements `IReflectionEngine`).

### 9. `/src/kernel/VerificationEngine.ts`
* **Purpose**: Automated DoD Gatekeeper pipeline running compilation and static diagnostic checkers.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `DoDVerificationEngine` (Implements `IVerificationEngine`).

### 10. `/src/kernel/AgentRuntime.ts`
* **Purpose**: Coordinates step execution, rollbacks, and journals task outcomes.
* **Dependencies**: `/src/kernel/types.ts`.
* **Public Interfaces**: `CoreAgentRuntime` (Implements `IAgentRuntime`).

---

## 4. Sprint Breakdown

### Sprint 1: Shared Core Foundation & State Store
* **Goal**: Define all core domain contracts and build the in-memory state engine.
* **Modules**: Types Contract (`/src/kernel/types.ts`), State Store (`/src/kernel/StateStore.ts`).
* **Deliverables**: Explicit interface types file, fully functional state accumulator class.
* **Dependencies**: None.
* **Acceptance Criteria**:
  * Central contracts file compiles successfully with no missing types.
  * `InMemoryStateStore` instantiates safely, stores multiple task telemetry records, tracks durations, and is completely thread-safe.
* **Estimated Complexity**: Low (2/10)
* **Estimated LOC**: ~300 LOC
* **Risks**: Type definition mismatch during downstream sprints. Mitigated by declaring strict, generalized interface structures in advance.

### Sprint 2: Asynchronous Event Bus Core
* **Goal**: Enable asynchronous decoupling between systems.
* **Modules**: Event Bus (`/src/kernel/EventBus.ts`).
* **Deliverables**: Native-wrapped wildcard event emitter.
* **Dependencies**: Types Contract, State Store.
* **Acceptance Criteria**:
  * Event Bus correctly emits type-safe event frames.
  * Wildcard subscriber successfully captures all in-flight system communications.
  * Standard handlers catch errors gracefully without process failure.
* **Estimated Complexity**: Low-Medium (3/10)
* **Estimated LOC**: ~150 LOC
* **Risks**: Uncontrolled memory growth due to dangling concurrent listeners. Mitigated by setting max listeners limits and cleaning hooks.

### Sprint 3: Schema-Based Tool Registry & Sandboxing
* **Goal**: Build the secure execution perimeter for agent scripts.
* **Modules**: Tool Registry (`/src/kernel/ToolRegistry.ts`).
* **Deliverables**: Manifest-driven script executor and schema validator.
* **Dependencies**: Types Contract, Event Bus.
* **Acceptance Criteria**:
  * Automatically blocks and rejects calls failing structured JSON schema matches.
  * Correctly enforces risk-level and absolute directory boundaries.
  * Emits correct `ToolExecuted` telemetry event cards.
* **Estimated Complexity**: Medium (5/10)
* **Estimated LOC**: ~250 LOC
* **Risks**: Slow argument validation checks. Mitigated by using lightweight JSON schema validators.

### Sprint 4: Model Routing & Failover Policies
* **Goal**: Implement cost-effective and resilient prompt routing.
* **Modules**: Model Router (`/src/kernel/ModelRouter.ts`).
* **Deliverables**: Gemini SDK wrapper supporting retry logic.
* **Dependencies**: Types Contract, State Store.
* **Acceptance Criteria**:
  * Successfully routes simple tasks to fast models and complex refactors to reasoning models.
  * Automatically catches rate limits (429) and timeout errors, executing exponential backoffs.
  * Logs exact token counts and latency metrics.
* **Estimated Complexity**: Medium (5/10)
* **Estimated LOC**: ~200 LOC
* **Risks**: Flaky network connections or inaccurate local token trackers. Mitigated by caching rate policies.

### Sprint 5: Context Compression & Graph Builder
* **Goal**: Optimize token payloads sent to Gemini models.
* **Modules**: Context Builder (`/src/kernel/ContextBuilder.ts`).
* **Deliverables**: File-traversal indexer scanning import networks.
* **Dependencies**: Types Contract.
* **Acceptance Criteria**:
  * Safely traverses ES Module import lines to map dependent files.
  * Successfully compresses context size to stay below 8,000 tokens on complex queries.
* **Estimated Complexity**: Medium-High (6/10)
* **Estimated LOC**: ~350 LOC
* **Risks**: Heavy CPU loads when re-indexing massive codebases. Mitigated by saving index caches to `workspace-index.json`.

### Sprint 6: Task Planning, Verification, & Reflection Engine
* **Goal**: Build planning DAGs, critic agents, and safety-checking pipelines.
* **Modules**: Planner, Reflection Engine, Verification Engine.
* **Deliverables**: DAG Planner module, LLM critique script, automated build checker hook.
* **Dependencies**: Types Contract, Model Router.
* **Acceptance Criteria**:
  * Planner generates clean, non-linear dependency arrays of executable steps.
  * Verification pipeline triggers compilation and linter runs, handling failed compiles with rollbacks.
  * Reflection Critic evaluates outputs and scores confidence with high accuracy.
* **Estimated Complexity**: High (8/10)
* **Estimated LOC**: ~600 LOC
* **Risks**: Bad LLM plan formats or infinite loops. Mitigated by strict parser validation.

### Sprint 7: Integrated Agent Orchestration Loop (Agent Runtime)
* **Goal**: Connect all subsystems into a single autonomous pipeline.
* **Modules**: Agent Runtime (`/src/kernel/AgentRuntime.ts`).
* **Deliverables**: Orchestrator loop managing end-to-end task flows.
* **Dependencies**: All previous components (Sprints 1-6).
* **Acceptance Criteria**:
  * Task status advances dynamically from `Pending` through `Reflection` to `Completed` with zero manual intervention.
  * Any execution failure reverts target files to pre-flight safe checkpoints cleanly.
* **Estimated Complexity**: High (9/10)
* **Estimated LOC**: ~450 LOC
* **Risks**: Race conditions between event dispatchers and state updates. Mitigated by keeping state updates atomic.

---

## 5. Testing Plan

Every sprint includes a strict, non-negotiable verification sweep running before proceeding:

* **Unit Tests**:
  * Target: Single-module logical functions (e.g., State Store updates, schema validations).
  * Method: Executed via lightweight Node test scripts asserting inputs/outputs.
* **Contract Tests**:
  * Target: Type-safety validation.
  * Method: Enforced at build time via TypeScript Compilation (`tsc --noEmit`).
* **Integration Tests**:
  * Target: Sequential module handoffs (e.g., Event Bus triggering State Store updates, Model Router handling mock 429 timeouts).
  * Method: Executed via simulated mock flows confirming multi-module handoffs.

---

## 6. Incremental Delivery Strategy

* **Compilation Rule**: All newly added classes and files must reside inside `/src/kernel/`. No active production code in `/src/main.tsx` or `server.ts` will be modified until all Phase 2 components are fully stable and verified.
* **Dev Server Safety**: The repository must compile and lint perfectly at the end of every single sprint (`npm run build` and `npm run lint` must report zero errors).

---

## 7. First Coding Sprint Recommendation: Sprint 1 (Core Foundation & State Store)

We recommend targeting **Sprint 1: Shared Core Foundation & State Store** as our initial milestone.

* **Why?**: It is the absolute, most foundational building block of the entire pipeline. The Types Contract defines the specifications that all subsequent subsystems require to communicate. The State Store acts as our memory tracker—no system can track operations, report statuses, or log telemetries without it.
* **Scope**:
  * Establish the `/src/kernel/` workspace folder.
  * Write the centralized type definitions contract (`/src/kernel/types.ts`).
  * Implement the robust, thread-safe memory registry (`/src/kernel/StateStore.ts`).
  * Verify full static compilation and code completeness.

---

*This concludes the Phase 2 Core Engine Implementation Plan. We are standing by for your review and formal approval before initializing the codebases.*
