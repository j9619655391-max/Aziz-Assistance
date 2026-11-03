# Aziz Kernel Freeze v1.0 Protocol & Release Report

This document establishes the official **v1.0 Kernel Freeze**, cementing the architecture, public API surfaces, message structures, and version metadata contracts. All subsequent work on the Aziz Kernel is **Kernel v1.0 Contract Frozen**.

---

## 1. Scope of the Freeze

Effective immediately, the following core modules of the Aziz Kernel are declared **Frozen**:

* **`StateStore`** (`IStateStore`): Memory database and transaction engine.
* **`EventBus`** (`IEventBus`): Synchronous/Asynchronous event dispatcher.
* **`Planner`** (`IPlanner`): Heuristic and reasoning DAG generation engine.
* **`ContextBuilder`** (`IContextBuilder`): 4-layer workspace compression policy.
* **`ModelRouter`** (`IModelRouter`): Policy-driven routing system.
* **`VerificationEngine`** (`IVerificationEngine`): Definition of Done gatekeeper.
* **`ReflectionEngine`** (`IReflectionEngine`): Critic scorecard.
* **`AgentRuntime`** (`IAgentRuntime`): Sequenced lifecycle orchestrator.
* **`ToolRegistry`** (`IToolRegistry`): Execution sandbox bounds manager.

---

## 2. Version Metadata Contract

Each core module exposes an immutable, standardized version string. These metadata properties are saved to `TaskState` transitions and event journals to facilitate cross-system telemetry audits.

| Module | Property | Current v1.0 Value | Purpose |
| :--- | :--- | :--- | :--- |
| **`Planner`** | `planner_version` | `"1.0.0-rc2"` | Tracks changes to DAG construction schemas and planning templates. |
| **`ContextBuilder`** | `context_policy_version` | `"policy-v1.0"` | Tracks files inclusion and token compression algorithms. |
| **`VerificationEngine`** | `verification_policy_version` | `"policy-v1.0"` | Tracks strict syntax, compilation, and security scan rules. |
| **`ReflectionEngine`** | `reflection_version` | `"1.0.0-rc2"` | Tracks the evaluation criteria used to review agent outputs. |

---

## 3. Breaking-Change Policy

To preserve structural reliability during product integrations, any future interface modifications are bound by a strict breaking-change protocol:

1. **Defects & Patch Release**:
   * Bug fixes, micro-optimizations, or integration adapters may be introduced without version increments.
   * Internal code-level changes must not affect return types, method names, or argument structures.

2. **Breaking Changes (Major Version Increment)**:
   * Any change that alters a method signature, parameter list, property name, or event schema requires a major version increment (e.g., v1.0.0 to v2.0.0).
   * A formal architectural design review (ADR) must be published in `docs/adr/` before implementing any breaking changes.

3. **Backward Compatibility**:
   * Old event structures must be preserved or safely transformed inside `EventBus` routers to prevent broken dashboard states.

---

## 4. Transition to Product Integration (Aziz Studio)

With the completion of **RC-2: Production Readiness** and the **v1.0 Kernel Freeze**, the development team shifts focus away from runtime mechanics to product integration.

### Core Integration Goals

1. **Studio Connection**:
   * Bind the interactive frontend of Aziz Studio to the frozen `AgentRuntime` lifecycle methods.
   * Render active tasks, DAG paths, and tool progress bars dynamically.

2. **Live Telemetry & Dashboards**:
   * Map `EventBus` broadcasts to browser-facing WebSockets or server endpoints.
   * Graph historical prompt-to-token execution ratios and estimate run-time costs using live billing maps.

3. **Real Provider Gateways**:
   * Replace sandbox driver mocks with actual, production-ready network calls using real provider services (e.g., live Gemini model routes via the server).
