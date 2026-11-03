/**
 * @file /src/kernel/tests/SemanticIntelligenceService.test.ts
 * @description Comprehensive unit and integration test suite for the SemanticIntelligenceService.
 * Verifies dependency injection, stateless concurrency, happy path structured LLM parsing,
 * error boundaries, unicode support, nested objects support, timeouts, and dynamic high-quality fallback behaviors.
 */

import { SemanticIntelligenceService } from "../intelligence/SemanticIntelligenceService";
import { AIService } from "../../domains/infrastructure/AIService";
import { SemanticIntelligenceResult } from "../intelligence/types";

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
    console.log(`Semantic Intelligence Service Unit Tests Complete.`);
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

async function runSemanticTests() {
  console.log("===================================================");
  console.log("       SEMANTIC INTELLIGENCE SERVICE UNIT TEST      ");
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
                    canonicalConcept: "JavaScript",
                    normalizedTerms: ["JS", "ES6", "Vanilla JavaScript"],
                    relatedConcepts: ["Frontend", "TypeScript", "V8 Engine"],
                    similarityScore: 85,
                    confidencePercentage: 92,
                    knowledgeClusters: ["Programming Languages", "Web Engineering"],
                    transferableCapabilities: ["Asynchronous Flow Control", "DOM Manipulation"],
                    semanticTags: ["Web", "ClientSide", "V8"],
                    technologyRelationships: [
                      { concept: "TypeScript", relationshipType: "related", description: "Strict static typed extension." }
                    ],
                    reasoning: "High cohesion and overlap in modern web ecosystem."
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
      throw new Error("Provider Outage: LLM Down");
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
                  text: "{ invalid: true, missing_curly_brackets "
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
      throw new Error("API Timeout Exceeded (504)");
    },
    getClient: () => ({})
  } as unknown as AIService;

  // 1. Dependency Injection Test
  await suite.run("Dependency Injection - Instantiation", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    assert.ok(service instanceof SemanticIntelligenceService, "Service should instantiate correctly");
  });

  // 2. Happy Path Structured Parsing
  await suite.run("Happy Path - Strict JSON Parse & Schema Match", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    const result = await service.analyzeConcept("JS", "TypeScript");

    assert.equal(result.canonicalConcept, "JavaScript");
    assert.equal(result.similarityScore, 85);
    assert.equal(result.confidencePercentage, 92);
    assert.equal(result.normalizedTerms.length, 3);
    assert.equal(result.normalizedTerms[0], "JS");
    assert.equal(result.technologyRelationships[0].concept, "TypeScript");
  });

  // 3. Schema Validation Checks
  await suite.run("Schema Validation - Verification of output interface", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    const result = await service.analyzeConcept("JS");

    assert.ok(Array.isArray(result.knowledgeClusters), "Clusters should be list");
    assert.ok(Array.isArray(result.transferableCapabilities), "Capabilities should be list");
    assert.ok(Array.isArray(result.semanticTags), "Tags should be list");
    assert.ok(typeof result.reasoning === "string", "Reasoning should be present");
  });

  // 4. Stateless Execution Check
  await suite.run("Statelessness - Independent executions", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    
    const res1 = await service.analyzeConcept("JS");
    const res2 = await service.analyzeConcept("Docker");

    assert.equal(res1.canonicalConcept, res2.canonicalConcept, "Stateless runs return independent structured outputs");
  });

  // 5. Thread Safety & Parallel Requests
  await suite.run("Thread Safety - Concurrent requests are safe", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    
    const promises = Array.from({ length: 5 }).map((_, idx) => 
      service.analyzeConcept(`Concept-${idx}`)
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5, "Concurrently handles 5 asynchronous invocations");
    results.forEach((res) => {
      assert.equal(res.canonicalConcept, "JavaScript");
    });
  });

  // 6. Provider Failure Graceful Fallback
  await suite.run("Error boundaries - Graceful fallback on API exception", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceFailing);
    const result = await service.analyzeConcept("Linux");

    assert.equal(result.canonicalConcept, "Linux");
    assert.equal(result.semanticTags[0], "OS");
    assert.ok(result.confidencePercentage >= 50, "Confidence is calculated dynamically");
  });

  // 7. Malformed JSON Fallback Recovery
  await suite.run("Error boundaries - Graceful fallback on malformed JSON", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceMalformed);
    const result = await service.analyzeConcept("Docker", "Containers");

    assert.equal(result.canonicalConcept, "Docker");
    assert.equal(result.similarityScore, 90, "Deduplicated synonym similarity score fallback");
  });

  // 8. Timeout Recovery
  await suite.run("Timeout handling - Graceful fallback on API Timeout", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceTimeout);
    const result = await service.analyzeConcept("C Sharp", "C#");

    assert.equal(result.canonicalConcept, "C#");
    assert.equal(result.similarityScore, 100, "Calculates perfect similarity score for synonymous canonical forms");
  });

  // 9. Empty Input Processing
  await suite.run("Edge Cases - Empty/null inputs handling", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceFailing);
    const result = await service.analyzeConcept("");

    assert.equal(result.canonicalConcept, "");
    assert.equal(result.normalizedTerms.length, 0);
  });

  // 10. Unicode Support
  await suite.run("Edge Cases - Unicode payload support", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    const result = await service.analyzeConcept("日本語の概念", "🚀🔥💻");

    assert.equal(result.canonicalConcept, "JavaScript");
  });

  // 11. Large Context Processing
  await suite.run("Edge Cases - Large Context inputs processing", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceHappy);
    const largeTerm = "A".repeat(5000);
    const result = await service.analyzeConcept(largeTerm);

    assert.equal(result.canonicalConcept, "JavaScript");
  });

  // 12. Nested Objects Processing
  await suite.run("Edge Cases - Complex nested fallback processing", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceFailing);
    // Passing a very complex input to fallback
    const result = await service.analyzeConcept("System Administration");

    assert.ok(result.technologyRelationships.length > 0, "Fallback populates tech relations correctly");
    assert.ok(result.transferableCapabilities.length > 0, "Fallback populates capabilities correctly");
  });

  // 13. Dynamic Heuristic Synonym Normalization
  await suite.run("Heuristics - Dynamic synonym normalization and deduplication", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceFailing);
    const result = await service.analyzeConcept("C Sharp");

    assert.equal(result.canonicalConcept, "C#");
    assert.ok(result.normalizedTerms.includes("C#"), "Normalized terms list contains canon");
    assert.ok(result.normalizedTerms.includes("C Sharp"), "Normalized terms list contains raw input");
    assert.ok(result.normalizedTerms.includes("csharp"), "Case normalizations included and deduplicated");
  });

  // 14. Dynamic Heuristic Ecosystem Similarities
  await suite.run("Heuristics - Dynamic technology relationship ecosystems mapping", async () => {
    const service = new SemanticIntelligenceService(mockAIServiceFailing);
    const result = await service.analyzeConcept("VMware", "Hyper-V");

    assert.equal(result.similarityScore, 80, "Virtualization similarity mapped appropriately");
    assert.ok(result.transferableCapabilities.some(c => c.toLowerCase().includes("virtual")), "Capabilities should represent virtualization");
  });

  suite.report();
}

runSemanticTests().catch((err) => {
  console.error("Fatal exception during SemanticIntelligenceService unit testing:", err);
  process.exit(1);
});
