# ⚠️ Aziz AI Platform: Technical Risk Register

This document provides a rigorous, version-controlled audit of active technical debts, security vulnerabilities, scalability bottlenecks, performance risks, and test coverages within the **Aziz AI Platform** architecture.

---

## 1. Risk Matrix Overview

We evaluate architectural risks based on **Impact (1–5)** and **Probability (1–5)**, resulting in a composite **Risk Score (1–25)**.

| Risk ID | Title | Category | Impact | Prob | Score | Status | Mitigation Action |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **RSK-01** | Regex-Based Code Indexing | Technical Debt | 4 | 4 | **16** | 🔴 High | Transition to a 4-Layer symbolic AST Knowledge Graph. |
| **RSK-02** | Sandbox Escape / Command Injection | Security Risk | 5 | 2 | **10** | 🟡 Med | Enforce strict YAML Capability schemas and parameter validation. |
| **RSK-03** | In-Memory Task State Loss | Scalability Risk| 4 | 3 | **12** | 🟡 Med | Implement automated sync of `StateStore` transactions to Firestore. |
| **RSK-04** | Large Codebase Context Flooding | Performance Risk| 4 | 3 | **12** | 🟡 Med | Introduce context compression and semantic impact pruning. |
| **RSK-05** | Missing Automated Integration Tests | Test Coverage  | 3 | 4 | **12** | 🟡 Med | Establish mock-based terminal and router test suites. |

---

## 2. Deep Dive Risk Audits

### 🔴 RSK-01: Regex-Based Code Indexing (Workspace Indexer)
- **Technical Debt Description**: The current `workspace-index.json` is generated via standard string searches and regex patterns (inside `server.ts`). While extremely fast and responsive, it lacks true scope understanding, leading to false-positives on comments, dead code, or similarly named variables.
- **Security Risks**: None directly.
- **Scalability Risks**: As the codebase grows, simple regex scans will fail to track complex imports across nested packages or multi-file dependencies.
- **Performance Risks**: Large files can trigger catastrophic regex backtracking if patterns are excessively complex.
- **Missing Tests**: No unit tests exist for testing the parsing accuracy of complex ES modules.
- **Estimated Mitigation Effort**: **High** (32 hours). Requires migrating scanner to use a symbol-graph traversal algorithm.

---

### 🟡 RSK-02: Sandbox Escape / Command Injection (Secure Terminal)
- **Technical Debt Description**: Terminal executions in `/api/terminal/execute` rely on inline regex blockers (`sudo`, `rm -rf`). If a malicious input escapes this block (via shell interpolation, e.g., `` `rm` `` or `$()` substitution), it poses a system security threat.
- **Security Risks**: High. Potential read/write operations to system files outside the sandbox scope.
- **Scalability Risks**: Multi-user instances could corrupt or access other users' workspace directories if directories are not strictly isolated.
- **Performance Risks**: None.
- **Missing Tests**: Integration security suites verifying that injection payloads fail are missing.
- **Estimated Mitigation Effort**: **Medium** (16 hours). Wrap executions inside dynamically spun Docker scratch containers or rootless sandboxes.

---

### 🟡 RSK-03: In-Memory Task State Loss (State Store)
- **Technical Debt Description**: Active execution metrics, tokens consumed, and DAG planning steps are currently stored inside Express RAM arrays. If the server container restarts or experiences cold starts, active session contexts are lost.
- **Security Risks**: Leads to inconsistent authorization states if a task crashes mid-transaction.
- **Scalability Risks**: Prevents running multiple, distributed Express nodes since memory is not shared.
- **Performance Risks**: Memory consumption can grow linearly with active tasks if old states are not regularly cleaned up.
- **Missing Tests**: No recovery testing under server crash scenarios.
- **Estimated Mitigation Effort**: **Low-Medium** (12 hours). Sync Event Bus transactions directly into Firestore, leveraging our existing Firebase client.

---

### 🟡 RSK-04: Large Codebase Context Flooding (Performance Risk)
- **Technical Debt Description**: When asking questions about complex modules, the platform is forced to supply full files in context, which exhausts the LLM context window.
- **Security Risks**: None.
- **Scalability Risks**: Prohibits scaling the platform to enterprise codebases exceeding 100,000 lines of code.
- **Performance Risks**: Extreme latency and exponential cost overhead on model generation.
- **Missing Tests**: No benchmarking suite for tracking token load trends.
- **Estimated Mitigation Effort**: **Medium** (20 hours). Implement semantic context pruning using symbolic relations in the Knowledge Graph.

---

### 🟡 RSK-05: Missing Automated Integration Tests (Verification Engine)
- **Technical Debt Description**: While unit build compilation (`npm run build`) and linting (`npm run lint`) succeed flawlessly, there are no mock integration tests simulating multi-model failovers, task planning DAGs, or Event Bus delivery chains.
- **Security Risks**: High risk of regression when deploying updates to core Agent prompts.
- **Scalability Risks**: Slows down development and deployment velocity.
- **Performance Risks**: None.
- **Missing Tests**: Comprehensive end-to-end integration tests.
- **Estimated Mitigation Effort**: **Medium** (24 hours). Add a `/tests` suite running Jest/Vitest for testing the Aziz Kernel routing and bus.
