/**
 * @file /src/kernel/tests/ModelRouter.test.ts
 * @description Comprehensive zero-dependency unit tests for ModelRouter.
 * Validates selection policies, retries, failover chains, cost estimations, and telemetry event publishing.
 */

import { ModelRouter, MockLLMProvider } from "../ModelRouter";
import { IEventBus, KernelEvent } from "../types";

/**
 * Lightweight test framework runner.
 */
class TestRunner {
  private totalTests = 0;
  private failedTests = 0;

  public async run(name: string, fn: () => void | Promise<void>): Promise<void> {
    this.totalTests++;
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      console.log(`  ✅ Passed\n`);
    } catch (err: any) {
      this.failedTests++;
      console.error(`  ❌ Failed: ${err?.message || err}\n`);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  public finish(): void {
    console.log(`===========================================`);
    console.log(`Model Router Unit Tests Complete.`);
    console.log(`Total Trials: ${this.totalTests}`);
    console.log(`Success Rate: ${((this.totalTests - this.failedTests) / this.totalTests * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.totalTests - this.failedTests}`);
    console.log(`Failed: ${this.failedTests}`);
    console.log(`===========================================`);
    if (this.failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

const assert = {
  equal: <T>(actual: T, expected: T, msg?: string) => {
    if (actual !== expected) {
      throw new Error(`${msg || "Assertion failed"}: expected ${expected}, got ${actual}`);
    }
  },
  ok: (val: any, msg?: string) => {
    if (!val) {
      throw new Error(`${msg || "Assertion failed"}: value was not truthy`);
    }
  },
  throwsAsync: async (fn: () => Promise<any>, matchText?: string, msg?: string) => {
    try {
      await fn();
    } catch (err: any) {
      if (matchText && !err.message.includes(matchText)) {
        throw new Error(`${msg || "Assertion failed"}: expected error containing "${matchText}", got "${err.message}"`);
      }
      return; // success
    }
    throw new Error(`${msg || "Assertion failed"}: expected block to throw an error but it succeeded`);
  }
};

class MockEventBus implements IEventBus {
  public events: KernelEvent[] = [];

  public publish(event: Omit<KernelEvent, "eventId" | "timestamp">): void {
    const fullEvent: KernelEvent = {
      ...event,
      eventId: Math.random().toString(),
      timestamp: new Date().toISOString()
    };
    this.events.push(fullEvent);
  }

  public subscribe(type: string, handler: (event: KernelEvent) => void): void {
    // No-op for mock testing
  }

  public clear(): void {
    this.events = [];
  }
}

const runner = new TestRunner();

// --- TEST CASES ---

runner.run("Deterministic Policy Selection and Model Mapping", async () => {
  const primaryProvider = new MockLLMProvider("mock-primary", "Primary Mock");
  const router = new ModelRouter({
    providers: [primaryProvider]
  });

  // Test "fast" policy
  const fastRes = await router.generate("Check connection", "fast");
  assert.equal(fastRes.telemetry.selectedProvider, "mock-primary");
  assert.equal(fastRes.telemetry.selectedModel, "mock-fast");
  assert.ok(fastRes.content.includes("mock-fast"), "Should match model suffix");

  // Test "reasoning" policy
  const reasoningRes = await router.generate("Draft contract", "reasoning");
  assert.equal(reasoningRes.telemetry.selectedProvider, "mock-primary");
  assert.equal(reasoningRes.telemetry.selectedModel, "mock-reasoning");

  // Test "bulk" policy
  const bulkRes = await router.generate("Summarize transcript", "bulk");
  assert.equal(bulkRes.telemetry.selectedProvider, "mock-primary");
  assert.equal(bulkRes.telemetry.selectedModel, "mock-bulk");
});

runner.run("Retry Strategy - Recovers from Transient Failures", async () => {
  // Configured to fail exactly 2 times and then succeed
  const transientProvider = new MockLLMProvider("transient-provider", "Transient Provider", {
    behavior: "fail_then_success",
    failTimes: 2
  });

  const router = new ModelRouter({
    providers: [transientProvider],
    maxRetries: 3
  });

  const res = await router.generate("Fetch weather report", "fast");
  
  assert.equal(res.telemetry.selectedProvider, "transient-provider");
  assert.equal(res.telemetry.retryCount, 2, "Should record exactly 2 retries before succeeding");
  assert.ok(res.content.includes("[Mock response from transient-provider]"));
});

runner.run("Provider Failover (Deterministic Backups Mapping)", async () => {
  const mainProvider = new MockLLMProvider("main", "Main LLM Provider", {
    behavior: "always_fail"
  });
  const backupProvider = new MockLLMProvider("backup", "Fallback LLM Provider", {
    fixedResponse: "Safe fallback response payload"
  });

  const router = new ModelRouter({
    providers: [mainProvider, backupProvider],
    fallbacks: {
      "main": ["backup"]
    },
    maxRetries: 1 // Keep retry limit small for faster tests
  });

  const res = await router.generate("Audit ledger", "bulk");

  assert.equal(res.telemetry.selectedProvider, "backup", "Should fail over to fallback provider");
  assert.equal(res.content, "Safe fallback response payload");
  assert.equal(res.telemetry.retryCount, 0, "No retries should be counted for the successful backup provider itself");
});

runner.run("Failure Path - Exhausts All Providers and Throws", async () => {
  const providerA = new MockLLMProvider("providerA", "Failed Provider A", { behavior: "always_fail" });
  const providerB = new MockLLMProvider("providerB", "Failed Provider B", { behavior: "always_fail" });

  const router = new ModelRouter({
    providers: [providerA, providerB],
    fallbacks: {
      "providerA": ["providerB"]
    },
    maxRetries: 1
  });

  await assert.throwsAsync(
    async () => {
      await router.generate("Critical task run", "reasoning");
    },
    "All providers exhausted. Last failure: MockLLMProvider \"providerB\" intentional failure",
    "Should throw after exhausting all fallbacks"
  );
});

runner.run("Cost Estimation and Token Accounting", async () => {
  const customProvider = new MockLLMProvider("custom", "Custom LLM Provider", {
    tokenCount: { input: 1200, output: 450 }
  });

  const router = new ModelRouter({
    providers: [customProvider],
    policyMappings: {
      fast: { providerId: "custom", model: "gemini-3.5-flash" }, // Pricing: $0.075 / $0.30 per 1M
      reasoning: { providerId: "custom", model: "gemini-3.1-pro-preview" }, // Pricing: $1.25 / $5.00 per 1M
      bulk: { providerId: "custom", model: "gemini-3.5-flash" }
    }
  });

  // Calculate estimated cost for 1200 input tokens and 450 output tokens
  // For reasoning (gemini-3.1-pro-preview):
  // Input cost: 1200 * (1.25 / 1,000,000) = 0.0015
  // Output cost: 450 * (5.00 / 1,000,000) = 0.00225
  // Total cost: 0.00375
  const res = await router.generate("Perform calculus", "reasoning");

  assert.equal(res.telemetry.inputTokens, 1200, "Input token accounting correct");
  assert.equal(res.telemetry.outputTokens, 450, "Output token accounting correct");
  assert.equal(res.tokensConsumed, 1650, "Cumulative tokensConsumed correct");
  assert.equal(res.telemetry.estimatedCostUSD, 0.00375, "Cost estimation should calculate accurate math");
});

runner.run("Event Telemetry Publishing via Event Bus", async () => {
  const mockBus = new MockEventBus();
  const transientProvider = new MockLLMProvider("p", "P", {
    behavior: "fail_then_success",
    failTimes: 1
  });

  const router = new ModelRouter({
    providers: [transientProvider],
    eventBus: mockBus,
    maxRetries: 1
  });

  await router.generate("Hello model", "fast");

  const events = mockBus.events;
  assert.ok(events.length >= 3, "Should have registered start, retry, and completion events");
  
  assert.equal(events[0].type, "ModelRequestStarted");
  assert.equal(events[0].payload.policy, "fast");

  assert.equal(events[1].type, "ModelRequestRetry");
  assert.equal(events[1].payload.attempt, 1);

  assert.equal(events[2].type, "ModelRequestCompleted");
  assert.equal(events[2].payload.policy, "fast");
  assert.equal(events[2].payload.retries, 1);
});

// Run all
runner.finish();
