# AZIZ AI KERNEL: OPERATIONS SEQUENTIAL ORCHESTRATION
## AI OPERATIONS SEQUENCE DIAGRAM (SPRINT 10B DESIGN)

---

### Mermaid Execution Flow Diagram

```mermaid
sequenceDiagram
    autonumber
    participant TaskOrch as Task Orchestrator
    participant OpsOrch as AIIntelligenceOrchestrator
    participant ContextBld as ContextBuilder
    participant CostOpt as CostOptimizationEngine
    participant Planner as ExecutionPlanner
    participant Router as ModelRouter
    participant Registry as PromptRegistry
    participant Service as Intelligence Service (e.g. Risk)
    participant Provider as LLM Provider (e.g. Gemini API)
    participant Composer as ResponseComposer
    participant Telemetry as TelemetryObservability

    Note over TaskOrch, Telemetry: 1. Initialization and Optimization Phase
    TaskOrch->>OpsOrch: execute(OrchestratorRequest)
    activate OpsOrch
    OpsOrch->>ContextBld: sanitize & buildUnifiedContext(source, requirement)
    activate ContextBld
    ContextBld-->>OpsOrch: return CleanContext
    deactivate ContextBld

    OpsOrch->>CostOpt: lookupCache(contextHash)
    activate CostOpt
    alt Cache Hit
        CostOpt-->>OpsOrch: return CachedResponse
        OpsOrch-->>TaskOrch: return UnifiedResponse (Cached)
    else Cache Miss
        CostOpt-->>OpsOrch: return null (Cache Miss)
    end
    deactivate CostOpt

    Note over OpsOrch, Router: 2. Planning and Routing Phase
    OpsOrch->>Planner: buildPlan(desiredServices)
    activate Planner
    Planner-->>OpsOrch: return ExecutionDAG (concurrency groups)
    deactivate Planner

    OpsOrch->>Router: route(RouteRequest)
    activate Router
    Router-->>OpsOrch: return RouteResult (provider, modelName, endpoints)
    deactivate Router

    Note over OpsOrch, Provider: 3. Dynamic Service Parallel Execution (DAG Step)
    OpsOrch->>Registry: getPrompt("risk_audit_template")
    activate Registry
    Registry-->>OpsOrch: return PromptTemplate
    deactivate Registry

    OpsOrch->>Service: analyzeRisk(CleanContext, modelMeta)
    activate Service
    Service->>Provider: execute LLM Prompt (Gemini API / OpenAI)
    activate Provider
    Provider-->>Service: return structured payload
    deactivate Provider
    Service-->>OpsOrch: return RiskAnalysisResult
    deactivate Service

    Note over OpsOrch, Telemetry: 4. Composition and Telemetry logging
    OpsOrch->>Composer: compose(allCollectedOutputs)
    activate Composer
    Composer-->>OpsOrch: return UnifiedComposedResponse
    deactivate Composer

    OpsOrch->>Telemetry: logExecution(TelemetryEvent)
    activate Telemetry
    Telemetry-->>OpsOrch: confirmation
    deactivate Telemetry

    OpsOrch-->>TaskOrch: return OrchestratorResponse
    deactivate OpsOrch
```

---

### Step-by-Step Chronological Flow Explanation

#### 1. Context Optimization & Cache Lookup
- **Step 1**: The high-level **Task Orchestrator** triggers the main `execute` entrypoint on the `AIIntelligenceOrchestrator` containing raw source profiles and processing rules.
- **Step 2**: The **ContextBuilder** runs sanitization routines, stripping whitespaces, removing duplicate nodes, and building a high-density, clean context payload.
- **Step 3**: The orchestrator hashes the context and calls the **CostOptimizationEngine** to check for a valid cache hit. If hit, the orchestrator returns the cached response immediately, bypassing LLM processing costs.

#### 2. Planning & Model Selection
- **Step 4**: Upon a cache miss, the **ExecutionPlanner** sorts the desired services topologically, producing an execution DAG grouping independent processes (such as confidence evaluations and risk audits) into concurrent slots.
- **Step 5**: The **ModelRouter** evaluates the target capability classification, latency graphs, and token estimation indices, routing the execution to the optimal LLM provider and model (such as Gemini Flash).

#### 3. Parallel Execution & Template Dynamic Injections
- **Step 6**: The orchestrator fetches parameterized prompt templates from the centralized **PromptRegistry** rather than hardcoding prompts within services.
- **Step 7**: The Orchestrator parallelizes executions in accordance with the planner's concurrent groups. It dispatches calls to the respective intelligence services, supplying the active model metadata.
- **Step 8**: The active services interpolate context parameters into the retrieved prompts, invoking the resolved LLM provider.
- **Step 9**: The LLM Provider returns the structured JSON, which the services parse and return to the orchestrator.

#### 4. Unified Composition & Telemetry
- **Step 10**: The orchestrator passes the completed service responses to the **ResponseComposer** to compile them into a unified schema and calculate an integrated score.
- **Step 11**: The orchestrator registers performance profiles (token usage, duration curves, cache rates, model metadata) with the **TelemetryObservability** engine in a non-blocking background queue.
- **Step 12**: The fully composed and logged `OrchestratorResponse` is returned to the **Task Orchestrator** to render the dynamic user dashboard.
