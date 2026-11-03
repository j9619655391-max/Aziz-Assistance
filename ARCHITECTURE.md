# 🏗️ Aziz SRE & AI Software Engineering Assistant: Architecture Specification

This document provides a comprehensive, CTO-level architectural blueprint of the **Aziz AI Platform**, formally distinguishing between **Aziz Studio** (our presentation and dashboard gateway) and the autonomous **Aziz Kernel** (our stateful, event-driven execution engine).

---

## 1. High-Level Core Blueprint & The AI Kernel

The platform is designed around a strictly decoupled, asynchronous, interface-driven core. The frontend dashboard communicates through a secure API gateway, which routes work directly to the **Aziz Kernel**, preventing direct un-monitored tool executions.

```
+-----------------------------------------------------------------------------+
|                                 AZIZ STUDIO                                 |
|                         Frontend React 19 UI & Dashboard                    |
|                (Logs Panel, Diagnostic Panel, Terminal Panel, Vault)        |
+--------------------------------------+--------------------------------------+
                                       |
                                       | HTTPS (JSON)
                                       v
+--------------------------------------+--------------------------------------+
|                         EXPRESS API GATEWAY & ROUTER                        |
|                     (SRE Logs, Session Registry, Middlewares)               |
+--------------------------------------+--------------------------------------+
                                       |
                                       | Dispatches / Controls
                                       v
+-----------------------------------------------------------------------------+
|                                 AZIZ KERNEL                                 |
|                                                                             |
|  +---------------------------+   +---------------------------------------+  |
|  |       AI Event Bus        |==>|           State Store & Journal       |  |
|  +---------------------------+   +---------------------------------------+  |
|                ||                                    ||                     |
|                v                                     v                      |
|  +---------------------------+   +---------------------------------------+  |
|  |     Agent Runtime         |   |       Model Router & Fallbacks        |  |
|  | (Planner, Coder, Reviewer)|   |        (Gemini-3.5, Gemini-3.1)       |  |
|  +---------------------------+   +---------------------------------------+  |
|                ||                                    ||                     |
|                v                                     v                      |
|  +---------------------------+   +---------------------------------------+  |
|  |  Workspace Knowledge Graph|   |             DoD Engine                |  |
|  |   (Symbolic Dependencies) |   |        (Autonomous Verification)      |  |
|  +---------------------------+   +---------------------------------------+  |
|                                                                             |
+--------------------------------------+--------------------------------------+
                                       | Uses Managed APIs
                                       v
+--------------------------------------+--------------------------------------+
|                     SECURE TOOL REGISTRY & SANDBOX                          |
|         (File operations, Regex Guards, Security Filters, SMTP Alerts)      |
+-----------------------------------------------------------------------------+
```

---

## 2. Directory Tree Structure

The project implements a modular full-stack monorepo layout, separating static UI modules from core server routines.

```
/
├── server.ts                       # Express API Gateway, Router, & Kernel Simulation
├── package.json                    # Platform Dependencies & Build Scripts
├── tsconfig.json                   # Strict TypeScript Compilation Configuration
├── vite.config.ts                  # Vite Bundling Configurations (Port 3000)
├── metadata.json                   # Applet Configuration & Frame Permissions
├── workspace-index.json            # Token-Friendly Local Index (Summary of Codebase)
├── ARCHITECTURE.md                 # System Architectural Specifications (This File)
├── ROADMAP.md                      # Feature Status & Next-Gen Roadmap
├── src/                            # Frontend Application (Aziz Studio)
│   ├── main.tsx                    # React SPA Entrypoint
│   ├── App.tsx                     # Studio Main Dashboard & Layout Switcher
│   ├── index.css                   # Global Stylesheet importing Tailwind CSS
│   ├── types.ts                    # Shared Domain Interface Definitions
│   ├── components/                 # Isolated Studio UI Panels
│   │   ├── DiagnosticPanel.tsx     # Codebug Scan & Directory Explorer
│   │   ├── ChatPanel.tsx           # Context-Aware AI Command Console
│   │   ├── TerminalPanel.tsx       # DevOps Simulated Terminal Console
│   │   ├── MemoryVault.tsx         # Preference Registry & Secret Redacter
│   │   ├── GmailPanel.tsx          # Google Workspace Integration Interface
│   │   ├── JobAgentPanel.tsx       # Pitch optimizer and CV matches
│   │   └── LogPanel.tsx            # Unified Colored SRE Logs Feed
│   └── lib/
│       └── firebase.ts             # Firebase Firestore Persistent Storage Client
└── assets/                         # Static Media & Brand Assets
```

---

## 3. The Aziz Kernel: Interface Contracts

To support decoupled evolution, the engine is structured around modular, type-safe interfaces:

```typescript
// Core Kernel Module Contracts
export interface Planner {
  plan(goal: string, context: WorkspaceContext): Promise<TaskPlan>;
}

export interface Agent {
  id: string;
  role: string;
  capabilities: string[];
  execute(task: Task, context: WorkspaceContext): Promise<AgentResult>;
}

export interface Tool {
  id: string;
  description: string;
  permissions: string[];
  run(args: Record<string, any>): Promise<ToolOutput>;
}

export interface WorkspaceContext {
  files: string[];
  index: Record<string, any>;
  memory: Record<string, any>[];
  gitState?: string;
}
```

---

## 4. Decoupled Core Event Bus Specification

The internal communications are routed through an **Event Bus**, allowing system agents, diagnostics, and tools to emit events asynchronously without tight coupling.

### Event Payload Schema
```typescript
interface KernelEvent {
  eventId: string;
  timestamp: string;
  source: string; // e.g., "Planner", "DiagnosticAgent", "TerminalTool"
  type: "TaskCreated" | "PlanningCompleted" | "ToolExecuted" | "VerificationPassed" | "MemoryStored" | "FailureTriggered";
  payload: Record<string, any>;
}
```

### Event Replay and Tracking
Every event is appended to an in-memory **AI Event Journal**. This journal provides deterministic replays of agent sessions for debugging and ensures full audit logging for enterprise security compliance.

---

## 5. Stateful State Store & Telemetry Schema

To support live dashboard updates and transaction-level auditing, the Kernel maintains a strict state registry for each user task.

```typescript
interface TaskState {
  taskId: string;
  goal: string;
  status: "Pending" | "Planning" | "Running" | "Verification" | "Completed" | "Failed";
  currentAgent: string | null;
  currentStepIndex: number;
  steps: {
    stepId: string;
    description: string;
    status: "pending" | "running" | "completed" | "failed";
    durationMs?: number;
  }[];
  telemetry: {
    totalTokensIn: number;
    totalTokensOut: number;
    estimatedCostUsd: number;
    retriesCount: number;
    fallbacksUsed: string[];
    executionTimeMs: number;
  };
}
```

---

## 6. Workspace Semantic Knowledge Graph

Aziz Platform transitions code indexers from standard flat text matches to a **4-Layer Knowledge Graph**:

```
+-----------------------------------------------------------------+
|                   Layer 4: SEMANTIC RELATION GRAPH              |
|        - API usages, external endpoints, and component relations |
+--------------------------------+--------------------------------+
                                 |
                                 v
+-----------------------------------------------------------------+
|                    Layer 3: SYMBOLIC GRAPH                      |
|        - Function signatures, interface types, and database fields|
+--------------------------------+--------------------------------+
                                 |
                                 v
+-----------------------------------------------------------------+
|                     Layer 2: IMPORT DEPENDENCIES                |
|        - Code imports, module coupling, and system call graphs  |
+--------------------------------+--------------------------------+
                                 |
                                 v
+-----------------------------------------------------------------+
|                     Layer 1: FILESYSTEM TOPOLOGY                |
|        - Folders, files, extensions, and recursive directories  |
+--------------------------------+--------------------------------+
```

### Dependency Impact Analysis
When a file modification is proposed by an Agent, the impact analysis queries the **Symbol Graph** to predict downstream side-effects (e.g., *"Modifying types.ts will impact 7 exports and 14 files"*).

---

## 7. Definition of Done (DoD) Verification Engine

No code patch is applied to the workspace without successfully clearing the automated **DoD Gatekeeper Pipeline**:

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Compile Check   |====>|  Strict Linter   |====>|  Diagnostic Scan |
| (npm run build)  |     | (tsc / eslint)   |     | (8 Custom Rules) |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
                                                                   ||
                                                                   v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|   Memory Audit   |====>|   Self-Review    |====>| Final Confidence |
| (Secret Leaks)   |     | (Reflection LLM) |     |  Score Approval  |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

If any check fails:
1. The compilation output is piped back to the LLM as feedback.
2. The Kernel executes a **checkpoint rollback** to revert the file to its previous safe state.
3. The transaction is marked for retry (up to 3 times) with exponential backoff.

---

## 8. Database, Memory, & Tool Security Configurations

### 1. Durable Cloud Persistence (Firebase Firestore)
Integrated in `/src/lib/firebase.ts` to coordinate secure user-profile configurations, audit-trail compliance, and transaction logs.

### 2. Sandbox Tool Registries
Every available tool is mapped in a **Capability Manifest** declaring exact scopes:
- `filesystem.read`: Read-only code access. Limits operations to the project workspace directory.
- `filesystem.patch`: Safe block-replacement. Validated against the original target content.
- `terminal.execute`: Regex-blocked. Commands like `sudo`, `rm -rf`, or direct disk formats are intercepted and aborted instantly.

### 3. Model Failover & Router Policies
The AI router implements automatic failover with exponential backoff:
- **Fast Tasks**: Dispatched immediately to **Gemini-3.5-Flash** for sub-second latencies.
- **Complex Refactors / DAG Generation**: Targeted toward reasoning models.
- **Failover Routine**: If rate limits (429) or timeouts occur, it falls back instantly to **Gemini-3.1-Flash-Lite** to maintain service availability.
