# 📐 Aziz Kernel (Sprint 7) - Implementation Report

This report documents the design and code architecture deployed for the **Deterministic, Policy-Driven Model Router (Phase 4.1)** in the Aziz Kernel. The implementation satisfies all constraints and strict functional requirements of the Sprint 7 specification.

---

## 1. Technical Architecture & Flow

The `ModelRouter` abstracts LLM queries by defining clean provider, selection policy, retry, and failover boundaries. It routes incoming semantic requirements (`"fast" | "reasoning" | "bulk"`) to the correct model and provider, ensuring failure-safe delivery via layered fallback chains and localized retries.

```
                      ┌────────────────────────┐
                      │    Prompt / Policy     │
                      └───────────┬────────────┘
                                  │
                                  ▼
                      ┌────────────────────────┐
                      │      Model Router      │
                      └─────┬────────────┬─────┘
                            │            │
            ┌───────────────┘            └───────────────┐
            ▼                                            ▼
┌────────────────────────┐                  ┌────────────────────────┐
│  Primary Provider (P1) │                  │  Fallback Provider (P2)│
│  (Local Retries loop)  │──[Exhausted]────►│  (Local Retries loop)  │
└───────────┬────────────┘                  └────────────┬───────────┘
            │                                            │
            └───────────────────┬────────────────────────┘
                                │
                                ▼
                      ┌──────────────────┐
                      │  Telemetry Logs  │
                      │ (Tokens & Cost)  │
                      └──────────────────┘
```

### Flow Execution Steps:
1. **Policy Resolution**: Maps the semantic policy (`"fast"`, `"reasoning"`, `"bulk"`) to a deterministic `providerId` and `model` name.
2. **Deterministic Fallback Resolution**: Inspects the configured backup registry. If the primary provider fails, it computes a deterministic chain of fallback providers (e.g., failing over from a primary real API provider to a local fallback backup or mock provider).
3. **Local Retry Loop**: Within each provider execution block, if an exception (transient error, rate limit, timeout) occurs, the router retries up to `maxRetries` times before propagating the failure to the fallback provider.
4. **Token Accounting & Pricing Estimation**: Tracks input and output tokens, and computes exact cumulative financial costs (USD) using a predefined pricing tier registry.
5. **Normalizing Output Envelope**: Packages text responses and exact telemetry markers (latency, costs, actual model/provider, retries) into a type-safe `NormalizedModelResponse`.
6. **Telemetry & Event-Bus dispatching**: Publishes lifecycle events (`ModelRequestStarted`, `ModelRequestRetry`, `ModelRequestCompleted`, `ModelRequestFailed`) to the central `IEventBus`.

---

## 2. Abstraction Interfaces

The implementation fully implements the central `IModelRouter` from `/src/kernel/types.ts`:

```typescript
export interface IModelRouter {
  generate(
    prompt: string, 
    policy: "fast" | "reasoning" | "bulk", 
    systemInstruction?: string
  ): Promise<ModelResponse>;
}
```

Every model provider is structured under the same clean `ILLMProvider` interface to guarantee complete vendor independence:

```typescript
export interface ProviderResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface ILLMProvider {
  id: string;
  name: string;
  generate(
    prompt: string,
    model: string,
    options?: {
      systemInstruction?: string;
      temperature?: number;
    }
  ): Promise<ProviderResponse>;
}
```

---

## 3. Strict Boundary Compliance

To protect the core of the Aziz Kernel, we validated that the `ModelRouter` complies with the following boundaries:
* **No Tight Coupling**: Fully decoupled from any single vendor. Supports both real Gemini APIs and local/mock test environments interchangeably.
* **Deterministic Behavior**: Given the same configuration, the router resolves providers, fallback chains, and retries in a completely deterministic sequence.
* **Isolated Testing Harnesses**: Fully supported by zero-dependency unit, failure-path, failover, and high-throughput validation benchmarking files.
