/**
 * @file /src/kernel/tests/ConfidenceService.test.ts
 * @description Comprehensive unit and integration test suite for the ConfidenceService.
 * Verifies dependency injection, stateless concurrency, happy path structured LLM parsing,
 * error boundaries, unicode support, nested objects support, timeouts, and dynamic high-quality fallback behaviors.
 */

import { ConfidenceService } from "../intelligence/ConfidenceService";
import { AIService } from "../../domains/infrastructure/AIService";
import { ConfidenceResult } from "../intelligence/types";

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
    console.log(`Confidence Service Unit Tests Complete.`);
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

async function runConfidenceTests() {
  console.log("===================================================");
  console.log("          CONFIDENCE SERVICE UNIT TEST RUN         ");
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
                    confidencePercentage: 92,
                    confidenceCategory: "High",
                    confidenceFactors: [
                      { factor: "Key match", impact: "Positive", description: "All core keys are present." }
                    ],
                    uncertaintiesDetected: [
                      { item: "Version tag", possibleInterpretations: ["v1.0", "v1.1"], riskLevel: "Low" }
                    ],
                    missingInformation: [
                      { field: "Metadata block", description: "Optional project info missing", importance: "Minor" }
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
      throw new Error("Provider Outage: Service Unavailable");
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
                  text: "{ invalid: true, missing_braces "
                }
              ]
            }
          }
        ]
      };
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Timeout behavior
  const mockAIServiceTimeout = {
    generateContentWithFallback: async () => {
      // Simulate timeout by rejecting or throwing timeout error
      throw new Error("Gateway Timeout (504)");
    },
    getClient: () => ({})
  } as unknown as AIService;

  // 1. Dependency Injection Test
  await suite.run("Dependency Injection - Instantiation", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    assert.ok(service instanceof ConfidenceService, "Service should instantiate correctly");
  });

  // 2. Happy Path Structured Parsing
  await suite.run("Happy Path - Strict JSON Parse & Schema Match", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    const source = { id: "101", user: "Aziz", role: "Admin" };
    const processed = { userId: "101", name: "Aziz", privilege: "Full" };

    const result = await service.evaluateConfidence(source, processed);

    assert.equal(result.confidencePercentage, 92);
    assert.equal(result.confidenceCategory, "High");
    assert.equal(result.confidenceFactors[0].factor, "Key match");
    assert.equal(result.uncertaintiesDetected[0].item, "Version tag");
    assert.equal(result.missingInformation[0].importance, "Minor");
  });

  // 3. Stateless Execution Check
  await suite.run("Statelessness - Independent executions", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    
    const source1 = { a: 1 };
    const source2 = { b: 2 };
    
    const res1 = await service.evaluateConfidence(source1, {});
    const res2 = await service.evaluateConfidence(source2, {});

    assert.equal(res1.confidencePercentage, res2.confidencePercentage, "Stateless runs should produce correct expected outputs independently");
  });

  // 4. Thread Safety & High Concurrency
  await suite.run("Thread Safety - Concurrent requests are safe", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    
    const promises = Array.from({ length: 5 }).map((_, idx) => 
      service.evaluateConfidence({ id: idx }, { userId: idx })
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5, "Should handle parallel reentrant calls without issue");
    results.forEach((res) => {
      assert.equal(res.confidencePercentage, 92);
    });
  });

  // 5. Provider Failure Graceful Fallback
  await suite.run("Error boundaries - Graceful fallback on API exception", async () => {
    const service = new ConfidenceService(mockAIServiceFailing);
    const source = { title: "Technical Spec", id: "505" };
    const processed = { docTitle: "Technical Spec" };

    const result = await service.evaluateConfidence(source, processed);

    assert.ok(result.confidencePercentage >= 55 && result.confidencePercentage <= 98, "Fallback should calculate rational confidence within limits");
    assert.ok(result.confidenceCategory !== undefined, "Category must be filled");
    assert.equal(result.confidenceFactors.length, 2, "Fallback should contain standard confidence factors");
    // Ensure omitted parameters are detected by fallback missing fields logic
    assert.ok(result.missingInformation.some(info => info.field === "id"), "Fallback should detect unmapped 'id' source property");
    assert.ok(result.missingInformation.some(info => info.field === "title"), "Fallback should detect unmapped 'title' source property");
  });

  // 6. Malformed JSON Fallback Recovery
  await suite.run("Error boundaries - Graceful fallback on malformed JSON", async () => {
    const service = new ConfidenceService(mockAIServiceMalformed);
    const source = { token: "secret_123" };
    const processed = {};

    const result = await service.evaluateConfidence(source, processed);

    assert.ok(result.confidencePercentage !== undefined);
    assert.equal(result.missingInformation[0].field, "token", "Fallback should discover unmapped token field");
  });

  // 7. Timeout Fallback Handling
  await suite.run("Timeout handling - Graceful fallback on Gateway Timeout", async () => {
    const service = new ConfidenceService(mockAIServiceTimeout);
    const result = await service.evaluateConfidence({ item: "A" }, { item: "A" });

    assert.ok(result.confidencePercentage > 0, "Fallback must supply structural backup on timeout");
  });

  // 8. Empty Inputs Graceful Handling
  await suite.run("Edge Cases - Empty/null inputs handling", async () => {
    const service = new ConfidenceService(mockAIServiceFailing);
    const result = await service.evaluateConfidence(null, undefined);

    assert.ok(result.confidencePercentage !== undefined);
    assert.equal(result.missingInformation[0].field, "Temporal reference metrics", "Should default to standard temporal reference metrics");
  });

  // 9. Large Context Processing
  await suite.run("Edge Cases - Large Context inputs processing", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    
    // Create an input payload of substantial size
    const largeSource = {
      records: Array.from({ length: 200 }).map((_, idx) => ({
        id: idx,
        uuid: `uuid-${idx}`,
        name: `User Name ${idx}`,
        payload: "A extremely large sequence of string characters designed to test token buffer capacities in Sprints and ensure the parsing holds."
      }))
    };

    const result = await service.evaluateConfidence(largeSource, { recordsCount: 200 });
    assert.equal(result.confidencePercentage, 92);
  });

  // 10. Unicode Support
  await suite.run("Edge Cases - Unicode payload support", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    const source = { greeting: "こんにちは", emoji: "🚀🔥💻", text: "Schönheit und Überlegenheit" };
    
    const result = await service.evaluateConfidence(source, { ok: true });
    assert.equal(result.confidencePercentage, 92);
  });

  // 11. Nested Objects Processing
  await suite.run("Edge Cases - Nested Objects processing", async () => {
    const service = new ConfidenceService(mockAIServiceHappy);
    const nestedSource = {
      meta: {
        schema: {
          version: "1.2",
          author: { name: "Aziz", details: { contact: "dev@aziz.ai" } }
        }
      },
      data: [ { value: 100, tags: ["prod", "active"] } ]
    };

    const result = await service.evaluateConfidence(nestedSource, { status: "processed" });
    assert.equal(result.confidencePercentage, 92);
  });

  suite.report();
}

runConfidenceTests().catch((err) => {
  console.error("Fatal exception during ConfidenceService unit testing:", err);
  process.exit(1);
});
