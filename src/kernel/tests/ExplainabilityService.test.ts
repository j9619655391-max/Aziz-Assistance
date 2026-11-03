/**
 * @file /src/kernel/tests/ExplainabilityService.test.ts
 * @description Comprehensive unit and integration test suite for the ExplainabilityService.
 * Verifies dependency injection, stateless concurrency, happy path structured LLM parsing,
 * error boundaries, and dynamic high-quality fallback behaviors.
 */

import { ExplainabilityService } from "../intelligence/ExplainabilityService";
import { AIService } from "../../domains/infrastructure/AIService";
import { ExplanationResult } from "../intelligence/types";

class TestSuite {
  private passed = 0;
  private failed = 0;

  public async run(name: string, fn: () => void | Promise<void>): Promise<void> {
    console.log(`[TEST] Running: ${name}...`);
    try {
      await fn();
      this.passed++;
      console.log(`  ✅ Passed\n`);
    } catch (err: any) {
      this.failed++;
      console.error(`  ❌ Failed: ${err?.message || err}\n`);
      if (err.stack) {
        console.error(err.stack);
      }
    }
  }

  public report(): void {
    console.log(`===================================================`);
    console.log(`Explainability Service Unit Tests Complete.`);
    console.log(`Total Trials: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`===================================================`);
    if (this.failed > 0) {
      process.exit(1);
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

const suite = new TestSuite();

async function runExplainabilityTests() {
  console.log("===================================================");
  console.log("        EXPLAINABILITY SERVICE UNIT TEST RUN       ");
  console.log("===================================================\n");

  // Mock Happy Path LLM response
  const mockAIServiceHappy = {
    generateContentWithFallback: async (params: { model?: string; contents: any; config?: any }) => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    explanation: "Decision resolved via matching heuristics",
                    reasoningBreakdown: [
                      "Inspected technical skills",
                      "Evaluated communication index"
                    ],
                    evidenceCollected: [
                      { source: "cv_doc", description: "Found 5 years experience", strength: 0.85 }
                    ],
                    weightedContributions: [
                      { factor: "experience", weight: 0.6, rationale: "Highly relevant background" },
                      { factor: "interview", weight: 0.4, rationale: "Excellent soft skills" }
                    ],
                    alternativeOutcomes: [
                      { scenario: "No interview completed", likelihood: 0.1, impact: "Assessment pending" }
                    ]
                  })
                }
              ]
            }
          }
        ]
      };
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Failing LLM response to test fallback behavior
  const mockAIServiceFailing = {
    generateContentWithFallback: async () => {
      throw new Error("API Limit Exceeded");
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Malformed JSON output
  const mockAIServiceMalformed = {
    generateContentWithFallback: async () => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "{ malformed: json, missing: braces "
                }
              ]
            }
          }
        ]
      };
    },
    getClient: () => ({})
  } as unknown as AIService;

  // 1. Dependency Injection Test
  await suite.run("Dependency Injection - Instantiation", async () => {
    const service = new ExplainabilityService(mockAIServiceHappy);
    assert.ok(service instanceof ExplainabilityService, "Service should instantiate correctly");
  });

  // 2. Happy Path structured parsing
  await suite.run("Happy Path - Strict JSON Parse & Schema Match", async () => {
    const service = new ExplainabilityService(mockAIServiceHappy);
    const context = "Evaluate candidate SRE qualifications";
    const inputs = { experienceYears: 5, certs: ["CKA", "AWS-SA"] };

    const result = await service.explain(context, inputs);

    assert.equal(result.explanation, "Decision resolved via matching heuristics");
    assert.equal(result.reasoningBreakdown.length, 2);
    assert.equal(result.reasoningBreakdown[0], "Inspected technical skills");
    assert.equal(result.evidenceCollected[0].source, "cv_doc");
    assert.equal(result.evidenceCollected[0].strength, 0.85);
    assert.equal(result.weightedContributions.length, 2);
    assert.equal(result.weightedContributions[0].factor, "experience");
    assert.equal(result.alternativeOutcomes[0].likelihood, 0.1);
  });

  // 3. Stateless Execution Check
  await suite.run("Statelessness - Independent executions", async () => {
    const service = new ExplainabilityService(mockAIServiceHappy);
    
    // Changing the inputs or contexts shouldn't pollute internal instance references since it's stateless
    const context1 = "First audit";
    const context2 = "Second audit";
    const inputs = { active: true };

    const res1 = await service.explain(context1, inputs);
    const res2 = await service.explain(context2, inputs);

    assert.equal(res1.explanation, res2.explanation, "Should return correct mocked outputs independently");
  });

  // 4. Thread-safety & Concurrent Reentrancy
  await suite.run("Thread Safety - Concurrent requests are safe", async () => {
    const service = new ExplainabilityService(mockAIServiceHappy);
    
    // Run several promises concurrently
    const promises = Array.from({ length: 5 }).map((_, idx) => 
      service.explain(`Context ${idx}`, { index: idx })
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5, "Should successfully handle 5 concurrent requests without thread pollution");
    results.forEach((res) => {
      assert.equal(res.explanation, "Decision resolved via matching heuristics");
    });
  });

  // 5. Error boundary - Graceful fallback on exception
  await suite.run("Error boundaries - Graceful fallback on API exception", async () => {
    const service = new ExplainabilityService(mockAIServiceFailing);
    const context = "Failing scenario test";
    const inputs = { databaseCapacity: "90%", latencyMs: 250 };

    const result = await service.explain(context, inputs);

    // Should return high-quality fallback explanation instead of throwing
    assert.ok(result.explanation.includes(context), "Fallback explanation should describe the context");
    assert.equal(result.reasoningBreakdown.length, 4, "Fallback should contain standard reasoning breakdown");
    
    // Check that evidence is collected for each input variable passed
    assert.equal(result.evidenceCollected.length, 2, "Should collect evidence for both inputs");
    assert.equal(result.evidenceCollected[0].source, "Input: databaseCapacity");
    assert.equal(result.weightedContributions.length, 2, "Should distribute weights dynamically");
    assert.equal(result.weightedContributions[0].factor, "databaseCapacity");
  });

  // 6. Error boundary - Graceful fallback on malformed JSON
  await suite.run("Error boundaries - Graceful fallback on malformed JSON", async () => {
    const service = new ExplainabilityService(mockAIServiceMalformed);
    const context = "Malformed JSON scenario test";
    const inputs = { parameterA: "active" };

    const result = await service.explain(context, inputs);

    assert.ok(result.explanation.includes(context));
    assert.equal(result.evidenceCollected[0].source, "Input: parameterA");
  });

  // 7. Fallback completeness with empty inputs
  await suite.run("Fallback behavior with empty inputs", async () => {
    const service = new ExplainabilityService(mockAIServiceFailing);
    const context = "Empty input scenario";
    const inputs = {};

    const result = await service.explain(context, inputs);

    assert.ok(result.explanation.includes(context));
    assert.equal(result.evidenceCollected.length, 1, "Fallback should return at least one default system evidence");
    assert.equal(result.evidenceCollected[0].source, "System");
    assert.equal(result.weightedContributions.length, 1, "Fallback should return default system weights");
    assert.equal(result.weightedContributions[0].factor, "System Defaults");
  });

  suite.report();
}

runExplainabilityTests().catch((err) => {
  console.error("Fatal exception during ExplainabilityService unit testing:", err);
  process.exit(1);
});
