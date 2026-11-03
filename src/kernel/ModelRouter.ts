/**
 * @file /src/kernel/ModelRouter.ts
 * @description Pure, deterministic LLM Model Router implementing IModelRouter.
 * Features a clean provider abstraction, routing policies, fallbacks, retry logic,
 * token accounting, pricing models, and event telemetry reporting.
 */

import { IModelRouter, ModelResponse, IEventBus } from "./types";

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

export interface ModelPricing {
  inputCostPerMillion: number;
  outputCostPerMillion: number;
}

/** Predefined token cost registry for pricing estimation (in USD) */
export const MODEL_PRICING_REGISTRY: Record<string, ModelPricing> = {
  "gemini-3.5-flash": { inputCostPerMillion: 0.075, outputCostPerMillion: 0.30 },
  "gemini-3.1-pro-preview": { inputCostPerMillion: 1.25, outputCostPerMillion: 5.00 },
  "gemini-3.1-flash-lite": { inputCostPerMillion: 0.0375, outputCostPerMillion: 0.15 },
  "mock-fast": { inputCostPerMillion: 0.01, outputCostPerMillion: 0.05 },
  "mock-reasoning": { inputCostPerMillion: 0.10, outputCostPerMillion: 0.50 },
  "mock-bulk": { inputCostPerMillion: 0.05, outputCostPerMillion: 0.25 }
};

export interface RouteTelemetry {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
  latencyMs: number;
  retryCount: number;
  selectedProvider: string;
  selectedModel: string;
}

export interface NormalizedModelResponse extends ModelResponse {
  telemetry: RouteTelemetry;
}

export interface PolicyMapping {
  providerId: string;
  model: string;
}

export interface ModelRouterOptions {
  providers: ILLMProvider[];
  policyMappings?: Record<"fast" | "reasoning" | "bulk", PolicyMapping>;
  fallbacks?: Record<string, string[]>; // providerId -> backupProviderIds
  maxRetries?: number;
  retryDelayMs?: number;
  eventBus?: IEventBus;
}

export class ModelRouterError extends Error {
  constructor(message: string, public readonly details?: any) {
    super(`ModelRouterError: ${message}`);
    this.name = "ModelRouterError";
  }
}

export class ModelRouter implements IModelRouter {
  private readonly providers: Map<string, ILLMProvider> = new Map();
  private readonly policyMappings: Record<"fast" | "reasoning" | "bulk", PolicyMapping>;
  private readonly fallbacks: Record<string, string[]>;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly eventBus?: IEventBus;

  constructor(options: ModelRouterOptions) {
    if (!options.providers || options.providers.length === 0) {
      throw new ModelRouterError("ModelRouter must be initialized with at least one provider");
    }

    for (const provider of options.providers) {
      this.providers.set(provider.id, provider);
    }

    // Default policy mappings if not specified
    this.policyMappings = options.policyMappings ?? {
      fast: { providerId: options.providers[0].id, model: "gemini-3.1-flash-lite" },
      reasoning: { providerId: options.providers[0].id, model: "gemini-3.1-pro-preview" },
      bulk: { providerId: options.providers[0].id, model: "gemini-3.5-flash" }
    };

    this.fallbacks = options.fallbacks ?? {};
    this.maxRetries = options.maxRetries ?? 2;
    this.retryDelayMs = options.retryDelayMs ?? 0; // 0 for test speed by default
    this.eventBus = options.eventBus;
  }

  /**
   * Generates a completion from an LLM by resolving provider policies, fallback chains, and retry limits.
   */
  public async generate(
    prompt: string,
    policy: "fast" | "reasoning" | "bulk",
    systemInstruction?: string
  ): Promise<NormalizedModelResponse> {
    const mapping = this.policyMappings[policy];
    if (!mapping) {
      throw new ModelRouterError(`No policy mapping defined for "${policy}"`);
    }

    const taskId = "task_router_invocation"; // Tracking placeholder
    if (this.eventBus) {
      this.eventBus.publish({
        taskId,
        type: "ModelRequestStarted",
        payload: { policy, systemInstruction, promptLength: prompt.length }
      });
    }

    // Prepare provider sequence: primary provider followed by any fallback providers
    const providerSequence: string[] = [mapping.providerId];
    const backups = this.fallbacks[mapping.providerId] ?? [];
    for (const backupId of backups) {
      if (!providerSequence.includes(backupId)) {
        providerSequence.push(backupId);
      }
    }

    let lastError: Error | null = null;

    // Iterate through primary and backup providers in deterministic sequence
    for (const providerId of providerSequence) {
      const provider = this.providers.get(providerId);
      if (!provider) {
        continue; // Skip unrecognized backup providers
      }

      const model = this.resolveModelForProvider(providerId, mapping.model);
      let retries = 0;

      // Retry loop for the current provider
      while (retries <= this.maxRetries) {
        try {
          const startTime = Date.now();
          
          const result = await provider.generate(prompt, model, {
            systemInstruction,
            temperature: policy === "reasoning" ? 0.0 : 0.7
          });

          const durationMs = Date.now() - startTime;
          const cost = this.estimateCost(model, result.inputTokens, result.outputTokens);

          const telemetry: RouteTelemetry = {
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            estimatedCostUSD: cost,
            latencyMs: durationMs,
            retryCount: retries,
            selectedProvider: providerId,
            selectedModel: model
          };

          const response: NormalizedModelResponse = {
            content: result.content,
            tokensConsumed: result.inputTokens + result.outputTokens,
            latencyMs: durationMs,
            telemetry
          };

          if (this.eventBus) {
            this.eventBus.publish({
              taskId,
              type: "ModelRequestCompleted",
              payload: {
                policy,
                selectedProvider: providerId,
                selectedModel: model,
                tokensUsed: response.tokensConsumed,
                costUSD: cost,
                retries,
                latencyMs: durationMs
              }
            });
          }

          return response;
        } catch (err: any) {
          lastError = err;
          retries++;

          if (this.eventBus) {
            this.eventBus.publish({
              taskId,
              type: "ModelRequestRetry",
              payload: {
                policy,
                providerId,
                model,
                attempt: retries,
                error: err.message || String(err)
              }
            });
          }

          if (retries <= this.maxRetries && this.retryDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
          }
        }
      }
    }

    // If all providers and all retries fail, raise error
    if (this.eventBus) {
      this.eventBus.publish({
        taskId,
        type: "ModelRequestFailed",
        payload: { policy, error: lastError?.message || "All providers exhausted" }
      });
    }

    throw new ModelRouterError(
      `All providers exhausted. Last failure: ${lastError?.message || "Unknown error"}`,
      lastError
    );
  }

  /**
   * Estimates cost of a call using registered pricing tiers.
   */
  private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING_REGISTRY[model] ?? { inputCostPerMillion: 0.1, outputCostPerMillion: 0.5 };
    const inputCost = (inputTokens / 1000000) * pricing.inputCostPerMillion;
    const outputCost = (outputTokens / 1000000) * pricing.outputCostPerMillion;
    return parseFloat((inputCost + outputCost).toFixed(8));
  }

  /**
   * Normalizes or matches model names based on provider rules.
   */
  private resolveModelForProvider(providerId: string, baseModel: string): string {
    // If the provider is a mock, map to its mock sibling to keep pricing records straight
    if (providerId.startsWith("mock")) {
      if (baseModel.includes("lite")) return "mock-fast";
      if (baseModel.includes("pro")) return "mock-reasoning";
      return "mock-bulk";
    }
    return baseModel;
  }
}

/**
 * Robust mock provider for testing and failover validation.
 */
export class MockLLMProvider implements ILLMProvider {
  private failCount = 0;

  constructor(
    public readonly id: string,
    public readonly name: string,
    private readonly config: {
      behavior?: "success" | "always_fail" | "fail_then_success" | "timeout";
      failTimes?: number;
      tokenCount?: { input: number; output: number };
      latencyMs?: number;
      fixedResponse?: string;
    } = {}
  ) {}

  public async generate(
    prompt: string,
    model: string,
    options?: { systemInstruction?: string; temperature?: number }
  ): Promise<ProviderResponse> {
    const behavior = this.config.behavior ?? "success";
    const latency = this.config.latencyMs ?? 5;

    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }

    if (behavior === "always_fail") {
      throw new Error(`MockLLMProvider "${this.id}" intentional failure`);
    }

    if (behavior === "timeout") {
      throw new Error(`MockLLMProvider "${this.id}" request timed out`);
    }

    if (behavior === "fail_then_success") {
      const targetFailTimes = this.config.failTimes ?? 1;
      if (this.failCount < targetFailTimes) {
        this.failCount++;
        throw new Error(`MockLLMProvider "${this.id}" transient failure (attempt ${this.failCount})`);
      }
    }

    const inputTokens = this.config.tokenCount?.input ?? Math.ceil(prompt.length / 4);
    const outputTokens = this.config.tokenCount?.output ?? 24;

    return {
      content: this.config.fixedResponse ?? `[Mock response from ${this.id}] Generated for prompt "${prompt.slice(0, 20)}..." using model ${model}`,
      inputTokens,
      outputTokens,
      latencyMs: latency
    };
  }

  public reset(): void {
    this.failCount = 0;
  }
}
