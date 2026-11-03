# 🗺️ Aziz SRE & AI Software Engineering Assistant: Vision Roadmap

This roadmap details the strategic vision, commercial branding model, current completion statuses, and next-generation engineering phases for the **Aziz AI Platform**. It outlines a clear target trajectory to outperform legacy coding tools like Cursor, Claude Code, Cline, and RooCode.

---

## 1. Product Positioning & Strategic Vision

Aziz AI Platform is built to fill the massive gap between **file-centric IDE extensions** (e.g., Cursor, Windsurf) and **raw, un-sandboxed command execution systems** (e.g., OpenClaw, Claude Code).

### 🎯 Positioning Matrix

| Capability Vector | Legacy Editors (Cursor) | Command Runners (Claude Code) | Aziz AI Platform (Vision) |
| :--- | :---: | :---: | :---: |
| **Code Editing Precision** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Deterministic Diagnostics**| ⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Zero-Trust Command Security**| ⭐ | ⭐ | ⭐⭐⭐⭐⭐ |
| **Autonomous SRE Automation** | ⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Modular Event-Driven Engine**| ⭐ | ⭐ | ⭐⭐⭐⭐⭐ |

**Strategic Edge**: Aziz AI Platform is a security-first, SRE-oriented autonomous engineer. By pairing static rule-based analysis (custom diagnostics engine) with intelligent semantic networks, the platform guarantees zero-trust codebase integrity, prevents key leakage, and isolates execution workflows.

---

## 2. Commercial Branding & Product Lines

To facilitate seamless product scaling and team deployment, the platform is structured into four distinct commercial divisions:

```
                  +----------------------------------------------+
                  |                 AZIZ STUDIO                  |
                  |     (Web Dashboard, Visual Editor, IDEs)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |                 AZIZ KERNEL                  |
                  |    (Asynchronous Core, Event Bus, State)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |                   AZIZ SDK                   |
                  |     (Capability Manifests, MCP Registry)     |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |                  AZIZ CLOUD                  |
                  |  (Distributed Workers, Shared Team Memory)   |
                  +----------------------------------------------+
```

1. **Aziz Studio**: The user-facing visual cockpit. Includes the SRE Logs, Codebug Explorer, Terminal Sandbox, and configuration controls. Available as a Web App, CLI, and future IDE Extensions (VSCode/JetBrains).
2. **Aziz Kernel**: The event-driven, model-agnostic orchestrator engine. Manages state stores, planning graphs, and execution rollbacks.
3. **Aziz SDK**: The plugin and Model Context Protocol (MCP) framework allowing developers to build custom system capabilities.
4. **Aziz Cloud**: Multi-tenant team memory sharing, remote high-compute sandbox networks, and distributed SRE agents.

---

## 3. Detailed Evolutionary Roadmap Phases

```
  Phase 1 [Foundation]     Phase 2 [Aziz Kernel]    Phase 3 [Autonomous]    Phase 4 [Enterprise]
  +--------------------+   +--------------------+   +--------------------+   +--------------------+
  | - React Studio UI  |   | - Event Bus Core   |   | - DAG Task Planner |   | - VSCode / JetBrains|
  | - 37 REST APIs     |   | - State Store      |   | - Workspace Graph  |   | - Distributed Agent|
  | - Code Indexer     | =>| - Agent Runtime    | =>| - Checkpoint/Roll  | =>| - Team Memory Cloud|
  | - Diagnostics      |   | - Tool Registry    |   | - Reflector Agent  |   | - Dedicated Models |
  | - Command Blockers |   | - Telemetry Engine |   | - Verification Bus |   | - Multi-tenant SRE |
  +--------------------+   +--------------------+   +--------------------+   +--------------------+
       (DELIVERED)               (ACTIVE)                 (PLANNED)                (FUTURE)
```

### 🌟 Phase 1: Zero-Trust Foundation (Delivered & Validated)
*Focus: Deliver stable codebase-indexing, deterministic diagnostics, security sandboxing, and SRE monitoring.*
* **Delivered Components**:
  * **React Studio UI**: Seven integrated management panels.
  * **Unified Express Gateway**: Robust modular architecture exposing 37 REST endpoints.
  * **Deterministic Diagnostics**: Custom static analysis rule engine scanning for security leaks and code loops.
  * **Secure Command Terminal**: Full regex blocker preventing dangerous root commands (`rm -rf`, `sudo`).
  * **Model Router**: Backoff and automatic fallbacks between Gemini 3.5 and 3.1 models.

### 🧠 Phase 2: Decoupled Aziz Kernel Engine (v2.0 - Active Milestone)
*Focus: Decouple the orchestrator into a stateful, event-driven operating system for agents.*
* **Key Targets**:
  * **Asynchronous Event Bus**: Routing task requests, agent states, and tool invocations via deterministic channels.
  * **Execution State Store**: Full transaction schemas tracking step durations, model latencies, and token costs.
  * **AI Event Journal**: Safe recording and replay capability for audit trails and diagnostics.
  * **Machine-Readable Capability Manifests**: Schema-based tool schemas allowing the Kernel to dynamically invoke filesystem or terminal commands safely.

### 🤖 Phase 3: Autonomous Workspace DAG Planning (v3.0 - Planned)
*Focus: Move from human-driven tool execution to multi-agent goal resolution.*
* **Key Targets**:
  * **Directed Acyclic Graph (DAG) Task Planner**: Decomposes complex user goals into non-linear, dependent tasks.
  * **Workspace Semantic Graph**: Symbol, import, and structural relationships modeling codebase impact analysis.
  * **Gatekeeper Definition of Done (DoD) Engine**: Automatic compilation, linting, and custom diagnostics verification before changes are committed.
  * **Checkpoint & Rollback Routine**: Automated git-based checkout points allowing the kernel to revert workspace edits on failed compilation.

### 🌐 Phase 4: Enterprise Distributed SRE Ecosystem (v4.0 - Future)
*Focus: Extend the Aziz AI Platform into team environments and local workspaces.*
* **Key Targets**:
  * **VSCode & Cursor Extension Pack**: Connecting local editors to remote Aziz Kernels.
  * **MCP Host Registry**: Standardized integration for third-party MCP services.
  * **Distributed SRE Worker Pools**: Parallel tasks distributed safely across isolated Docker scratch-containers.
  * **Dedicated Fine-Tuned Models**: Specialized, high-performance routing models for code repairs and security patching.
