# AZIZ AI KERNEL: RUNTIME ARCHITECTURE
## PLATFORM COGNITIVE ENGINE TOPOLOGY & COMPOSITIONS

---

### 1. RUNTIME LAYER TOPOLOGY
The runtime is organized into three decoupled layers to ensure strict separation of concerns, scalability, and system stability.

```
+-------------------------------------------------------------------------------------------------------------+
|                                         I. APPLICATION LAYER (STATEFUL)                                     |
|                                                                                                             |
|  - Manages active user sessions, databases, files, and UI routes.                                           |
|  - Business Modules: Recruitment (ATS), Employment (Schedules), Procurement (Contracts).                    |
|  - Ingests raw inputs (PDFs, spreadsheets, logs) and triggers cognitive runs.                                |
+------------------------------------------------------+------------------------------------------------------+
                                                       |
                                                       | Dispatches standard OrchestratorRequest
                                                       v
+-------------------------------------------------------------------------------------------------------------+
|                                      II. AI OPERATIONS LAYER (STATELESS)                                    |
|                                                                                                             |
|  - Acts as the cognitive compiler and execution scheduling manager.                                         |
|  - Controls execution plans (DAG), routing, prompt rendering, context compression, and caching.             |
|  - Coordinates, monitors, and parallelizes service tasks.                                                   |
+------------------------------------------------------+------------------------------------------------------+
                                                       |
                                                       | Invokes modular, typed service APIs
                                                       v
+-------------------------------------------------------------------------------------------------------------+
|                                     III. COGNITIVE SERVICES LAYER (STATELESS)                               |
|                                                                                                             |
|  - Standalone analytical modules processing domain-neutral requests.                                        |
|  - Services: SemanticMatching, ConfidenceService, RiskIntelligence, Explainability, Recommendations.        |
|  - Performs isolated prompt interpolation and triggers upstream provider connections.                      |
+-------------------------------------------------------------------------------------------------------------+
```

---

### 2. DECOUPLED PARALLEL EXECUTION PARADIGM
To maximize processing throughput and prevent sequential latency stack-ups, the AI Operations Layer enforces a decoupled parallel execution paradigm:

- **Topological Clustering**: The `ExecutionPlanner` analyzes the dependency graph. Independent services (e.g. `SemanticIntelligence` and `RiskIntelligence`) are clustered into a single concurrent execution block.
- **Asynchronous Concurrent Dispatches**: The `AIIntelligenceOrchestrator` uses non-blocking parallel dispatches (e.g., `Promise.all` in TypeScript environments) to trigger clustered services concurrently.
- **Non-Blocking Background Tasks**: Sub-tasks that are non-critical for the immediate user interface (e.g., `DecisionLog` insertions and `Telemetry` writes) are dispatched to the event bus or background threads, allowing the user response to resolve immediately.

---

### 3. VENDOR-AGNOSTIC LLM BINDING LAYERS
To eliminate vendor lock-in and insulate the system from single-provider outages:

- **Provider Abstraction Pattern**: Services never invoke API endpoints directly. They execute requests via the `ModelRouter` using the unified `IModelRouter` contract.
- **Payload Translation Adapters**: The router maintains specialized conversion adapters for each supported provider:
  - **Gemini Adapter**: Maps requests to `@google/genai` structures.
  - **OpenAI Adapter**: Maps requests to `openai` package conventions.
  - **Anthropic Adapter**: Converts parameters to Anthropic API formats.
  - **Ollama Adapter**: Handles local containerized requests.
- **Seamless Failover Redirection**: If a request to a primary provider returns a service-level failure (e.g., HTTP 503, rate limits), the router automatically redirects the request to a comparable model from a different vendor (e.g., falling back from Gemini Pro to Claude Sonnet), ensuring continuous platform availability.
