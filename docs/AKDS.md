# 🧠 Aziz AI Platform: AI Kernel Design Specification (AKDS)

This document serves as the **authoritative technical implementation specification** for the core engine of the Aziz AI Platform: the **Aziz Kernel (v2.0)**. It details module interfaces, schemas, workflows, and diagrams required to execute secure, autonomous software engineering and SRE tasks.

---

## 1. Complete Module Hierarchy

The Aziz Kernel is structured as a strictly decoupled hierarchy, where communications flow asynchronously via the **Event Bus**, and state is maintained within a thread-safe, memory-based **State Store**.

```
                           +-------------------------------------+
                           |            AZIZ STUDIO              |
                           |       (React Presentation UI)       |
                           +------------------+------------------+
                                              |
                                              | HTTPS / WebSockets
                                              v
                           +------------------+------------------+
                           |          EXPRESS GATEWAY            |
                           |        (API Route Security)         |
                           +------------------+------------------+
                                              |
                                     Dispatches Task
                                              v
+---------------------------------------------+---------------------------------------------+
|                                         AZIZ KERNEL                                       |
|                                                                                           |
|    +---------------------------------------------------------------------------------+    |
|    |                                  EVENT BUS                                      |    |
|    |                (Node.js EventEmitter, Wildcard Event Bus Routing)               |    |
|    +----------------------------------------+----------------------------------------+    |
|                                             |                                             |
|                     +-----------------------+-----------------------+                     |
|                     |                                               |                     |
|                     v                                               v                     |
|    +---------------------------------+             +---------------------------------+    |
|    |           STATE STORE           |             |           AGENT RUNTIME         |    |
|    |      (TaskStates & Journal)     |             |      (Orchestration Loop)       |    |
|    +----------------+----------------+             +----------------+----------------+    |
|                     |                                               |                     |
|                     | Query / Mutate                                | Spawns Agents       |
|                     v                                               v                     |
|    +---------------------------------+             +---------------------------------+    |
|    |          TELEMETRY ENGINE       |             |           AGENT POOL            |    |
|    |     (Cost and Token Tracker)    |             |    (Planner, Coder, Reflector)  |    |
|    +---------------------------------+             +----------------+----------------+    |
|                                                                     |                     |
|                                                                     | Resolves/Invokes    |
|                                                                     v                     |
|    +---------------------------------------------------------------------------------+    |
|    |                                 SYSTEM SERVICES                                 |    |
|    |                                                                                 |    |
|    |  +---------------------------+  +---------------------------+  +-------------+  |    |
|    |  |     CONTEXT BUILDER       |  |       MODEL ROUTER        |  |  DoD ENGINE |  |    |
|    |  |  (Graph Context Pruner)   |  |   (Policy-Based Router)   |  | (Verifier)  |  |    |
|    |  +---------------------------+  +---------------------------+  +-------------+  |    |
|    |                                                                                 |    |
|    +----------------------------------------+----------------------------------------+    |
|                                             |                                             |
|                                     Executes Actions                                      |
|                                             v                                             |
|    +---------------------------------------------------------------------------------+    |
|    |                              SECURE TOOL REGISTRY                               |    |
|    |      (File Systems, Simulated Terminals, Git Integration, SMTP Alerting)        |    |
+----+---------------------------------------------------------------------------------+----+
```

---

## 2. Codebase Folder Structure

The implementation for Phase 2 introduces a dedicated `kernel` namespace inside the source structure to keep presentation separate from agent mechanics:

```
/
├── server.ts                             # Express Bootstrapper, Static Asset Server & API Gateway
├── docs/                                 # Central Documentation Repository
│   ├── ARCHITECTURE.md                   # System Architecture Blueprint
│   ├── ROADMAP.md                        # Vision Roadmap & Complete Phase Outline
│   ├── RISK_REGISTER.md                  # Version-Controlled Technical Risks
│   └── adr/                              # Architectural Decision Records
│       ├── ADR-001-AI-KERNEL.md
│       ├── ADR-002-EVENT-BUS.md
│       └── ADR-007-EVENT-EMITTER-SELECTION.md
├── src/
│   ├── main.tsx                          # React UI Mounting Hook
│   ├── App.tsx                           # Studio Cockpit Panel Coordinator
│   ├── types.ts                          # Presentation-specific UI types
│   ├── components/                       # Dashboard Render Frameworks
│   │   ├── DiagnosticPanel.tsx
│   │   ├── ChatPanel.tsx
│   │   └── LogPanel.tsx
│   └── kernel/                           # 🌟 NEW: THE AZIZ KERNEL ENGINE
│       ├── types.ts                      # Authoritative core interface contracts
│       ├── EventBus.ts                   # Asynchronous EventEmitter implementation
│       ├── StateStore.ts                 # Task state memory dictionary & Telemetry
│       ├── ToolRegistry.ts               # Schema validator & Tool Capability registry
│       ├── ModelRouter.ts                # Policy-driven Gemini routing client
│       ├── ContextBuilder.ts             # 4-Layer Semantic Context Pruner
│       ├── VerificationEngine.ts         # Automated gatekeeper testing loop
│       ├── ReflectionEngine.ts           # LLM agent self-criticism module
│       └── AgentRuntime.ts               # Task executor & State Coordinator
```

---

## 3. Core Interface Contracts

Every module inside `/src/kernel/` interacts strictly through typed interface specifications:

```typescript
import { KernelEvent } from "./types";

/**
 * 1. Asynchronous Event Bus Spine
 */
export interface IEventBus {
  publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void;
  subscribe(type: KernelEvent["type"] | "*", handler: (event: KernelEvent) => void): void;
}

/**
 * 2. Real-Time Task State Store & Metric Telemetry
 */
export interface IStateStore {
  createTask(goal: string): string; // Returns unique taskId
  updateTaskStatus(taskId: string, status: TaskState["status"]): void;
  updateStep(taskId: string, stepId: string, updates: Partial<TaskStep>): void;
  recordTelemetry(taskId: string, usage: Partial<TaskTelemetry>): void;
  getTaskState(taskId: string): TaskState | null;
  listTasks(): TaskState[];
}

/**
 * 3. Machine-Readable Tool Capability Registry
 */
export interface IToolRegistry {
  registerTool(manifest: ToolManifest, handler: (args: any) => Promise<any>): void;
  executeTool(toolId: string, args: Record<string, any>, taskId: string): Promise<any>;
  listTools(): ToolManifest[];
  getTool(toolId: string): ToolManifest | null;
}

/**
 * 4. Policy-Driven LLM Model Router
 */
export interface IModelRouter {
  generate(
    prompt: string, 
    policy: "fast" | "reasoning" | "bulk", 
    systemInstruction?: string
  ): Promise<ModelResponse>;
}

/**
 * 5. 4-Layer Semantic Context Builder
 */
export interface IContextBuilder {
  buildContext(query: string, impactedFiles: string[]): Promise<WorkspaceContext>;
}

/**
 * 6. Non-Linear Task Planner
 */
export interface IPlanner {
  createPlan(taskId: string, goal: string, context: WorkspaceContext): Promise<TaskStep[]>;
}

/**
 * 7. Verification Gateway (DoD Gatekeeper)
 */
export interface IVerificationEngine {
  verify(taskId: string, filePaths: string[]): Promise<{
    success: boolean;
    logs: string[];
    errors: string[];
  }>;
}

/**
 * 8. LLM Reflection Critic
 */
export interface IReflectionEngine {
  review(taskId: string, goal: string, result: string): Promise<{
    passed: boolean;
    reasoning: string;
    confidenceScore: number; // 0-100
  }>;
}

/**
 * 9. Core Orchestration Loop (Agent Runtime)
 */
export interface IAgentRuntime {
  executeTask(taskId: string): Promise<boolean>;
}
```

---

## 4. Sequence Diagrams of Core Workflows

### A. End-to-End User Goal Resolution Flow
```
+------+             +---------+          +---------+          +---------+          +-------+          +------------+          +------------+
| User |             | Studio  |          | Kernel  |          | Planner |          | Model |          | Reflection |          | Verification|
+--+---+             +----+----+          +----+----+          +----+----+          +---+---+          +-----+------+          +-----+------+
   |                      |                    |                    |                   |                    |                       |
   |   Submit Goal        |                    |                    |                   |                    |                       |
   +--------------------->+                    |                    |                   |                    |                       |
   |                      |   Dispatch REST    |                    |                   |                    |                       |
   |                      +------------------->+                    |                   |                    |                       |
   |                      |                    |--+ Create Task     |                   |                    |                       |
   |                      |                    |  | (StateStore)    |                   |                    |                       |
   |                      |                    |<-----------------  |                   |                    |                       |
   |                      |                    |--+ Scan Context    |                   |                    |                       |
   |                      |                    |  | (Graph/Context) |                   |                    |                       |
   |                      |                    |<-----------------  |                   |                    |                       |
   |                      |                    |                    |                   |                    |                       |
   |                      |                    |   Generate Plan    |                   |                    |                       |
   |                      |                    +------------------->+                   |                    |                       |
   |                      |                    |                    |   Query Strategy  |                    |                       |
   |                      |                    |                    +------------------>+                    |                       |
   |                      |                    |                    |   Plan Back       |                    |                       |
   |                      |                    |<---------------------------------------+                    |                       |
   |                      |                    |   Task Plan Back   |                    |                   |                       |
   |                      |                    |<-------------------+                    |                   |                       |
   |                      |                    |                                                             |                       |
   |                      |                    |--+ Loop: Execute individual steps                           |                       |
   |                      |                    |  |   1. Invoke secure tool (Terminal/Filesystem)            |                       |
   |                      |                    |  |   2. Generate patches with Model                         |                       |
   |                      |                    |<----------------------------------                          |                       |
   |                      |                    |                                                             |                       |
   |                      |                    |   Execute DoD Verification                                  |                       |
   |                      |                    +------------------------------------------------------------------------------------>+
   |                      |                    |   Verify Logs & Status                                      |                       |
   |                      |                    |<------------------------------------------------------------------------------------+
   |                      |                    |                                                             |                       |
   |                      |                    |   Execute Self-Reflection                                   |                       |
   |                      |                    +------------------------------------------------------------>+                       |
   |                      |                    |   Reflection Verdict (Confidence)                           |                       |
   |                      |                    |<------------------------------------------------------------+                       |
   |                      |                    |                                                             |                       |
   |                      |                    |--+ Commit Work & Mark Done                                  |                       |
   |                      |                    |  | Save Memory Context                                      |                       |
   |                      |                    |<--------------------------                                  |                       |
   |                      |   SSE Task Event   |                                                             |                       |
   |                      |<-------------------+                                                             |                       |
   |   Task Complete!     |                    |                                                             |                       |
   |<---------------------+                    |                                                             |                       |
```

### B. Tool Execution Lifecycle
```
+---------+          +---------------+          +---------------+          +------------+          +------------+          +--------+
|  Agent  |          | ToolRegistry  |          | SchemaEngine  |          | Permission |          | Filesystem |          | Event  |
| Runtime |          |               |          |               |          |   Engine   |          | / Sandbox  |          |  Bus   |
+----+----+          +-------+-------+          +-------+-------+          +-----+------+          +-----+------+          +---+----+
     |                       |                          |                        |                       |                     |
     |   Execute Tool        |                          |                        |                       |                     |
     +---------------------->+                          |                        |                       |                     |
     |                       |--+ Lookup Manifest       |                        |                       |                     |
     |                       |  |                       |                        |                       |                     |
     |                       |<-----------------        |                        |                       |                     |
     |                       |                          |                        |                       |                     |
     |                       |   Validate Input Params  |                        |                       |                     |
     |                       +------------------------->+                        |                       |                     |
     |                       |   Schema Passed          |                        |                       |                     |
     |                       |<-------------------------+                        |                       |                     |
     |                       |                                                   |                       |                     |
     |                       |   Check Permissions for Caller                    |                       |                     |
     |                       +-------------------------------------------------->+                       |                     |
     |                       |   Authorization Approved                          |                       |                     |
     |                       |<--------------------------------------------------+                       |                     |
     |                       |                                                                           |                     |
     |                       |   Trigger Isolated Execution (With Timeout)                               |                     |
     |                       +-------------------------------------------------------------------------->+                     |
     |                       |   Execution Complete                                                      |                     |
     |                       |<--------------------------------------------------------------------------+                     |
     |                       |                                                                                                 |
     |                       |   Publish ToolExecuted Event                                                                    |
     |                       +------------------------------------------------------------------------------------------------>+
     |   Return Tool Result  |                                                                                                 |
     |<----------------------+                                                                                                 |
```

### C. Event Bus Lifecycle
```
+--------------+          +--------------+          +-------------------+          +---------------+          +--------------+
| Event Source |          |   EventBus   |          | StateStore Worker |          |  SRE Logger   |          | Client SSE   |
+------+-------+          +------+-------+          +---------+---------+          +-------+-------+          +------+-------+
       |                         |                            |                            |                         |
       |   Publish Event         |                            |                            |                         |
       +------------------------>+                            |                            |                         |
       |                         |--+ Inject UUID & Timestamp |                            |                         |
       |                         |  |                         |                            |                         |
       |                         |<-----------------          |                            |                         |
       |                         |                            |                            |                         |
       |                         |   Broadcast: "ToolExecuted"                             |                         |
       |                         +--------------------------->+                            |                         |
       |                         |                            |--+ Mutate State Record     |                         |
       |                         |                            |  | Log step duration       |                         |
       |                         |                            |<-----------------          |                         |
       |                         |   Broadcast: "ToolExecuted"                             |                         |
       |                         +-------------------------------------------------------->+                         |
       |                         |                            |                            |--+ Write SRE Console log|
       |                         |                            |                            |  | Redact passwords     |
       |                         |                            |                            |<-----------------        |
       |                         |   Broadcast: "*" (Wildcard)                             |                         |
       |                         +---------------------------------------------------------------------------------->+
       |                         |                            |                            |                         |--+ Stream Event
       |                         |                            |                            |                         |  | via Web Sockets
       |                         |                            |                            |                         |<-----------------
```

---

## 5. Event Catalog

All Core operations publish state-transitions onto the global event spine.

| Event Name | Producer Module | Key Consumers | Payload Schema | Failure Behavior | Retry Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`TaskCreated`** | Express Gateway | State Store, SRE Logger | `{ taskId: string, goal: string }` | Abort request, return HTTP 500 | No retries |
| **`PlanningStarted`** | Agent Runtime | State Store, SRE Logger | `{ taskId: string, planVersion: number }` | Log error, pause step | No retries |
| **`PlanningCompleted`** | Planner | State Store, Agent Runtime | `{ taskId: string, steps: TaskStep[] }` | Re-trigger with fallback model | 2 retries (exponential) |
| **`ToolExecuted`** | Tool Registry | State Store, Journal, SSE | `{ taskId: string, toolId: string, durationMs: number, riskLevel: string, args: any, resultSize: number }` | Revert file buffer to safe state | No retries |
| **`VerificationPassed`** | Verification Engine | Agent Runtime, State Store | `{ taskId: string, filePaths: string[], testsRan: number }` | Process next step in DAG | No retries |
| **`VerificationFailed`** | Verification Engine | Agent Runtime, State Store | `{ taskId: string, errors: string[], filePaths: string[] }` | Rollback code patch to safe checkpoint | up to 3 retries (with patch mutations) |
| **`CheckpointCreated`** | Agent Runtime | State Store | `{ taskId: string, gitSha?: string, backedUpFiles: string[] }` | Warn, write snapshot to memory | No retries |
| **`RollbackTriggered`** | Verification Engine | Agent Runtime | `{ taskId: string, filesReverted: string[], errorCause: string }` | Stop active task, notify supervisor | No retries |
| **`TaskCompleted`** | Agent Runtime | State Store, SRE Logger | `{ taskId: string, finalDurationMs: number, telemetry: TaskTelemetry }` | Output warning, persist telemetry | No retries |

---

## 6. Task State Machine

Task transitions are rigorously bounded to prevent impossible loops or invalid state mutations.

```
       [TaskCreated]
             |
             v
        +---------+
        | Pending |
        +----+----+
             |
             | PlanningStarted
             v
       +----------+
       | Planning |<------------------------+ (On Verification Error / Retry)
       +----+-----+                         |
            |                               |
            | PlanningCompleted             |
            v                               |
        +---------+                         |
        | Running |                         |
        +----+----+                         |
             |                              |
             | ToolExecuted (All steps done)|
             v                              |
      +--------------+                      |
      | Verification +----------------------+
      +------+-------+   VerificationFailed
             |
             | VerificationPassed
             v
       +------------+
       | Reflection |
       +-----+------+
             |
             | Confidence >= Threshold
             v
       +-----------+
       | Completed |
       +-----------+
```

### Valid Transitions Only:
- `Pending` ➡️ `Planning`
- `Planning` ➡️ `Running` | `Failed`
- `Running` ➡️ `Verification` | `Failed`
- `Verification` ➡️ `Running` (on sub-step retry) | `Planning` (on structural fallback) | `Reflection` | `Failed` (on max retries)
- `Reflection` ➡️ `Completed` (confidence >= 80) | `Planning` (confidence < 80, retry) | `Failed`
- `Completed` | `Failed` (Terminal states, no outbound paths)

---

## 7. Secure Tool Manifest Specification

Every platform command executes under a declarative manifest schema to avoid container escapes.

### Manifest Interface
```typescript
export interface ToolManifest {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // e.g., ["fs:read", "fs:write", "terminal:run"]
  riskLevel: "low" | "medium" | "high";
  timeoutMs: number;
  maxRetries: number;
  inputSchema: Record<string, any>;  // Declares formal JSON schemas
  outputSchema: Record<string, any>; // Declares structured output shapes
}
```

### Example Manifest: `filesystem.patch`
```json
{
  "id": "filesystem.patch",
  "name": "Surgical File Patcher",
  "description": "Edits an existing file by replacing a unique contiguous block of characters.",
  "permissions": ["fs:read", "fs:write"],
  "riskLevel": "medium",
  "timeoutMs": 10000,
  "maxRetries": 1,
  "inputSchema": {
    "type": "object",
    "properties": {
      "filePath": { "type": "string" },
      "targetContent": { "type": "string" },
      "replacementContent": { "type": "string" }
    },
    "required": ["filePath", "targetContent", "replacementContent"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "success": { "type": "boolean" },
      "bytesWritten": { "type": "number" }
    },
    "required": ["success"]
  }
}
```

---

## 8. Memory Schemas

The Memory system divides agent historical patterns into three distinct memory types:

```typescript
export interface UserPreferenceMemory {
  id: string;
  type: "preference";
  category: "editor" | "sre" | "security";
  content: string; // e.g., "Always use semicolons", "Deploy notifications to SMTP"
  importance: number; // 1-10
}

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

export interface GlobalRuleMemory {
  id: string;
  type: "global_rule";
  content: string; // e.g., "NEVER write password environment keys directly to git"
  enforceEverywhere: boolean;
}
```

---

## 9. Modular Workflow Flows

### A. Context Builder Flow
1. **Workspace Scan**: Collect files, folder shapes, and structural paths.
2. **Knowledge Graph Traversal**: Locate the modified file in the Symbol Map. Find direct imports (`defines`), dependent imports (`imports`), and calling modules (`calls`).
3. **Context Selection**: Rank dependencies by distance (Direct dependents: Rank 1, Transitive: Rank 2).
4. **Compression**: Strip boilerplate files (e.g., config files, compiled output directory artifacts). Package remains under 8,000 tokens to maximize model reasoning accuracy.

### B. Non-Linear DAG Planner Flow
1. **Analyze User Goal**: Extract the desired end-state and target technology.
2. **Decompose Tasks**: Split goals into independent execution targets (e.g., Target 1: Create types, Target 2: Setup Service, Target 3: Add UI component).
3. **Identify Dependencies**: Bind task sequences (e.g., UI component depends on Service; Service depends on types).
4. **Compile Task DAG**: Formulate non-linear, dependent execution blocks.

### C. Self-Reflection Critic Flow
1. **Assemble Outputs**: Gather the goal, the original code, the proposed patches, and the verification metrics.
2. **Review Patch Integrity**: Inspect changes for side effects, architectural regressions, and credential leakage.
3. **Score Confidence**: Output a rating from 1 to 100.
4. **Decision Boundary**: If score < 80, emit `VerificationFailed` and return to planning. If score >= 80, continue to completion.

### D. Automated DoD Verification Flow
1. **Pre-Flight Check**: Read current git status or memory checkpoints to prepare for immediate rollback.
2. **Static Check**: Run the deterministic Diagnostic rules on patched files.
3. **Build Check**: Invoke `npm run build` on the workspace directory to ensure clean TypeScript compilation.
4. **Lint Check**: Run `npm run lint` (`tsc --noEmit`) to prevent static type errors.
5. **Gate Verdict**: If compilation or static checks fail, execute `RollbackTriggered`, copy logs to error states, and schedule patch retry.

---

## 10. Robust Error Handling & Retry Matrix

| Failure Type | Signal Indicator | Mitigation / Error Handling Strategy | Auto-Retry Policy |
| :--- | :--- | :--- | :--- |
| **Model Rate Limit** | HTTP 429 Status code | Log alert to SRE panel. Exponential backoff delay (initial delay 1s, doubling each cycle). | Up to 4 retries, then trigger model failover. |
| **Model Timeout** | Network error (timeout > 30s) | Terminate request. Log timeout. Route request to alternative failover model (e.g., Flash). | 2 retries, then failover model. |
| **Compilation Error** | `npm run build` exit code > 0 | Capture error output stream from compiler. Revert code to pre-flight checkpoint. Feed errors back to Planner. | Up to 3 times, then fail task with "Uncompilable Code". |
| **Dangerous Command Block** | Terminal Block Regex trigger | Abort execution instantly before shell spawning. Post high-alert warning in Logs, update task status to "Failed". | ZERO RETRIES (Immediate hard failure). |
| **Workspace Index Staleness** | Empty index on file read | Clear index memory. Force full filesystem scanning routine. Rebuild Knowledge Graph. | 1 retry. |

---

## 11. Target Phase 2 KPIs

The success of the Phase 2 implementation will be monitored against the following measurable metrics:

| Metric Name | Performance Target | Measurement Strategy |
| :--- | :---: | :--- |
| **Average Planning Latency** | **< 3,500 ms** | Calculated via `process.hrtime` between `PlanningStarted` and `PlanningCompleted`. |
| **Average Tool Execution Latency** | **< 250 ms** | Tracking internal duration of filesystem and indexing routines. |
| **Context Compression Ratio** | **> 75%** | `(Compressed Context Size / Total Codebase Size) * 100` must exceed 75%. |
| **Model Failover Success Rate** | **> 98%** | Ratio of requests saved by model routing fallovers during simulated rate-limits. |
| **DoD Self-Correction Success Rate** | **> 90%** | Tasks that compile/lint successfully after a first-attempt compilation error. |
| **Average Self-Reflection Precision** | **> 95%** | Human validation confirming agent self-score alignment (no false successes). |
| **Zero-Trust Escape Escaped Count** | **0 (Strict)** | Absolutely zero shell injections or file escapes outside active workspace boundaries. |
