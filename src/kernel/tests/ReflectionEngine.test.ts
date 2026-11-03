/**
 * @file /src/kernel/tests/ReflectionEngine.test.ts
 * @description Unit tests and deterministic mock-provider tests for the ReflectionEngine.
 * Validates assessment parsing, severity classifications, event bus dispatch, and graceful crash recovery.
 */

import { ReflectionEngine, ReflectionReport } from "../ReflectionEngine";
import { IModelRouter, IEventBus, ModelResponse, KernelEvent } from "../types";

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
    console.log(`Reflection Engine Unit Tests Complete.`);
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
}

class MockModelRouter implements IModelRouter {
  public mockResponse: string = "";
  public shouldThrow: boolean = false;
  public lastPrompt: string = "";
  public lastSystemInstruction?: string;

  public async generate(
    prompt: string,
    policy: "fast" | "reasoning" | "bulk",
    systemInstruction?: string
  ): Promise<ModelResponse> {
    this.lastPrompt = prompt;
    this.lastSystemInstruction = systemInstruction;

    if (this.shouldThrow) {
      throw new Error("Simulated network timeout error");
    }

    return {
      content: this.mockResponse,
      tokensConsumed: 150,
      latencyMs: 12
    };
  }
}

const runner = new TestRunner();

// --- TEST CASES ---

runner.run("Pass Path - Evaluates successful execution and parses valid schema", async () => {
  const router = new MockModelRouter();
  const bus = new MockEventBus();
  
  router.mockResponse = JSON.stringify({
    passed: true,
    confidence: 0.95,
    reasoning_summary: "The code complies with all specifications. All tests passed beautifully.",
    identified_issues: [],
    recommended_actions: ["Deploy to staging environment."],
    risk_level: "low",
    requires_human_review: false
  });

  const engine = new ReflectionEngine({
    modelRouter: router,
    eventBus: bus
  });

  const report = await engine.review(
    "task-999",
    "Implement core user auth",
    "Code written successfully and verified.",
    { success: true, telemetry: { errorsCount: 0 } }
  );

  // Check correct parsed outcomes
  assert.equal(report.passed, true);
  assert.equal(report.confidence, 0.95);
  assert.equal(report.confidenceScore, 0.95, "Backward compatibility mapping should match");
  assert.equal(report.reasoning_summary, "The code complies with all specifications. All tests passed beautifully.");
  assert.equal(report.reasoning, "The code complies with all specifications. All tests passed beautifully.", "Backward compatibility mapping should match");
  assert.equal(report.risk_level, "low");
  assert.equal(report.requires_human_review, false);
  assert.equal(report.identified_issues.length, 0);
  assert.equal(report.recommended_actions[0], "Deploy to staging environment.");
  assert.equal(report.reflection_version, "1.0.0-rc2");
  assert.equal(report.model_version, "gemini-3.5-flash");
  assert.equal(report.evaluation_policy_version, "policy-v1.0");

  // Check EventBus message publication
  assert.equal(bus.events.length, 1);
  assert.equal(bus.events[0].type, "ReflectionCompleted");
  assert.equal(bus.events[0].payload.passed, true);
  assert.equal(bus.events[0].payload.risk_level, "low");
  assert.equal(bus.events[0].payload.requires_human_review, false);
});

runner.run("Failure Path - Handles model router failures gracefully via fallback", async () => {
  const router = new MockModelRouter();
  router.shouldThrow = true;

  const engine = new ReflectionEngine({ modelRouter: router });

  const report = await engine.review(
    "task-crash-test",
    "Generate layout",
    "Completed successfully."
  );

  // Failure must trigger standard high-risk fallback block
  assert.equal(report.passed, false);
  assert.equal(report.confidence, 0.5);
  assert.equal(report.risk_level, "high");
  assert.equal(report.requires_human_review, true);
  assert.ok(report.reasoning_summary.includes("Model Router execution failed"));
});

runner.run("Failure Path - Handles malformed JSON block from router gracefully via fallback", async () => {
  const router = new MockModelRouter();
  // Return non-JSON unparsable text
  router.mockResponse = "The code looks great, everything is passed. I highly recommend merging it.";

  const engine = new ReflectionEngine({ modelRouter: router });

  const report = await engine.review(
    "task-malformed-json",
    "Write core API",
    "Written."
  );

  assert.equal(report.passed, false);
  assert.equal(report.confidence, 0.5);
  assert.equal(report.risk_level, "high");
  assert.equal(report.requires_human_review, true);
  assert.ok(report.reasoning_summary.includes("Failed to parse Reflection output"));
});

runner.run("Schema extraction from Markdown Fenced Block", async () => {
  const router = new MockModelRouter();
  router.mockResponse = "Here is my evaluation:\n```json\n" + JSON.stringify({
    passed: false,
    confidence: 0.82,
    reasoning_summary: "The code contains potential memory leak issues.",
    identified_issues: ["Memory leak in event listeners"],
    recommended_actions: ["Clean up listeners inside useEffect hook."],
    risk_level: "medium",
    requires_human_review: true
  }) + "\n```";

  const engine = new ReflectionEngine({ modelRouter: router });

  const report = await engine.review("task-md-fence", "Refactor hooks", "Refactored.");

  assert.equal(report.passed, false);
  assert.equal(report.confidence, 0.82);
  assert.equal(report.risk_level, "medium");
  assert.equal(report.requires_human_review, true);
  assert.equal(report.identified_issues[0], "Memory leak in event listeners");
});

runner.finish();
