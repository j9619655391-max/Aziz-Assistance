# Architecture Decision Record (ADR-006): Policy-Based Model Router

## Context & Problem Statement
In Phase 1, model interactions were managed by a static helper that attempted Gemini 3.5 calls with basic rate-limiting retries before falling back to Gemini 3.1. As our platform expands, different tasks demand different trade-offs: diagnostic scans require low-cost high-throughput models, planning requires strong reasoning models, and user chat requires high-speed conversational responses. Using a single, static route handler leads to high latency, inefficient cost utilization, and poor adaptability.

## Decision
We will implement an intelligent, policy-based **Model Router** in the Aziz Kernel. The Router dynamically inspects incoming goals and selects the optimal model tier based on specified policy configurations:
- **`fast`**: Sub-second chat and conversational responses are routed directly to `gemini-2.5-flash` or `gemini-1.5-flash`.
- **`reasoning`**: Complex DAG generation, impact analysis, and deep codebase refactoring are routed to larger models.
- **`bulk`**: Workspace indexing scans and diagnostics check loops are run on light-weight, highly-efficient models.

The Model Router retains a resilient **Failover Chain**: if any active model returns a rate limit error (429) or transient timeout, the router automatically applies exponential backoff, records the fallback in the State Store telemetry, and routes the request to a fallback candidate (such as `gemini-1.5-flash-8b` or local small models).

### Model Router Contracts
```typescript
export type PolicyTier = "fast" | "reasoning" | "bulk" | "specialized";

export interface RoutingPolicy {
  tier: PolicyTier;
  maxRetries: number;
  initialDelayMs: number;
  allowedModels: string[];
}

export interface IModelRouter {
  generateText(prompt: string, policy: RoutingPolicy): Promise<{
    text: string;
    modelUsed: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
  }>;
}
```

## Consequences
- **Positive**: Optimizes API consumption costs by matching simple tasks with low-cost, high-speed models.
- **Positive**: Maintains high availability by isolating model fallbacks inside a dedicated, transparent layer.
- **Negative**: Adds token tracking overhead; requires parsing LLM headers or using local estimations to calculate tokens.

## Acceptance Criteria
- [ ] Correctly identifies task requirements and selects the assigned policy tier.
- [ ] Seamlessly falls back to the secondary model candidate when a rate limit or timeout is simulated.
- [ ] Captures exact token counts and execution latencies, and feeds this data directly to the `StateStore` telemetry database.
- [ ] Exposes a standardized configuration interface to easily switch default models in enterprise deployments.
