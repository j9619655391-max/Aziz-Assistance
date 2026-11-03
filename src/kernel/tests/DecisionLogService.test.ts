/**
 * @file /src/kernel/tests/DecisionLogService.test.ts
 * @description Comprehensive unit and integration test suite for the DecisionLogService.
 * Exercises all required capabilities: Dependency Injection, Happy Path, Schema Validation,
 * Statelessness, Thread Safety, Parallel Requests, Empty Inputs, Unicode, Nested Objects,
 * Timeout Recovery, Provider Failure, Malformed JSON, Deterministic Fallback, and Decision History Integrity.
 */

import { DecisionLogService } from "../intelligence/DecisionLogService";
import { AIService } from "../../domains/infrastructure/AIService";
import { IAppRepository } from "../../domains/shared/repository/IRepository";
import { DecisionRecord, DecisionLogEntry } from "../intelligence/types";

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
    console.log(`Decision Log Service Unit Tests Complete.`);
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

class MockRepository {
  private store: Record<string, any[]> = {};

  public async insert<T>(collectionName: string, item: any): Promise<T> {
    if (!this.store[collectionName]) {
      this.store[collectionName] = [];
    }
    const cloned = JSON.parse(JSON.stringify(item));
    this.store[collectionName].push(cloned);
    return cloned as T;
  }

  public async findAll<T>(collectionName: string): Promise<T[]> {
    return JSON.parse(JSON.stringify(this.store[collectionName] || [])) as T[];
  }

  public async addSystemLog(level: string, section: string, message: string): Promise<void> {
    // Mock system logger
  }
}

const suite = new TestSuite();

async function runDecisionTests() {
  console.log("===================================================");
  console.log("         DECISION LOG SERVICE UNIT TEST RUN        ");
  console.log("===================================================\n");

  // Mock Happy Path LLM Response
  const mockAIServiceHappy = {
    generateContentWithFallback: async (params: { model?: string; contents: any; config?: any }) => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "Resource optimization execution complete",
                    reasoning: "Allocated memory threshold adjusted based on low transactional volumes to scale-down container footprint.",
                    confidence: 95,
                    riskSummary: "Minimal risk. Continuous ping validation runs in isolated frames.",
                    semanticTags: ["automation", "optimization", "container-scale"]
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

  // Mock Failing LLM Response
  const mockAIServiceFailing = {
    generateContentWithFallback: async () => {
      throw new Error("Provider Outage: AI Engine Down");
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Malformed JSON Response
  const mockAIServiceMalformed = {
    generateContentWithFallback: async () => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "{ summary: broken, missing brackets: "
                }
              ]
            }
          }
        ]
      };
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Timeout Response
  const mockAIServiceTimeout = {
    generateContentWithFallback: async () => {
      throw new Error("API Timeout Exceeded (504)");
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Similarity Analysis Response
  const mockAIServiceSimilarity = {
    generateContentWithFallback: async () => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    {
                      decisionId: "dec_stable_happy_id",
                      similarityScore: 92,
                      matchExplanation: "Both decisions optimized resource pools and scale states."
                    }
                  ])
                }
              ]
            }
          }
        ]
      };
    },
    getClient: () => ({})
  } as unknown as AIService;

  // Mock Reason Evolution Response
  const mockAIServiceEvolution = {
    generateContentWithFallback: async () => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    trendSummary: "Decisions successfully transitioned from simple baseline records to comprehensive automated container tags.",
                    changesDetected: [
                      "Introduction of optimization constraints",
                      "Confidence levels increased"
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

  // 1. Dependency Injection Verification
  await suite.run("Dependency Injection - Instantiation", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);
    assert.ok(service instanceof DecisionLogService, "Should successfully instantiate class");
  });

  // 2. Happy Path structured log normalization
  await suite.run("Happy Path - Strict JSON Parse & Schema Match", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);
    const decisionInput = { action: "ScaleDown", ratio: 0.5 };

    const record = await service.recordDecision(decisionInput);

    assert.equal(record.summary, "Resource optimization execution complete");
    assert.equal(record.confidence, 95);
    assert.equal(record.riskSummary, "Minimal risk. Continuous ping validation runs in isolated frames.");
    assert.ok(record.semanticTags.includes("optimization"), "Includes expected semantic tags");
  });

  // 3. Output Schema Validation Verification
  await suite.run("Schema Validation - Verification of output interface", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);
    const record = await service.recordDecision({ status: "ok" });

    assert.ok(typeof record.decisionId === "string", "ID must be a string");
    assert.ok(typeof record.timestamp === "string", "timestamp must be a string");
    assert.ok(typeof record.confidence === "number", "confidence must be a number");
    assert.ok(Array.isArray(record.semanticTags), "semanticTags must be an array");
    assert.ok(typeof record.reasoning === "string", "reasoning must be a string");
    assert.ok(typeof record.metadata === "object", "metadata must be a Record");
  });

  // 4. Stateless Execution Check
  await suite.run("Statelessness - Independent executions", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);

    const res1 = await service.recordDecision({ payload: "alpha" });
    const res2 = await service.recordDecision({ payload: "beta" });

    assert.ok(res1.decisionId !== res2.decisionId, "Stateless parallel runs maintain safe independent state identity");
  });

  // 5. Thread Safety Concurrency Verification
  await suite.run("Thread Safety - Concurrent requests are safe", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);

    const promises = Array.from({ length: 5 }).map((_, idx) => 
      service.recordDecision({ threadIndex: idx })
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5);
    results.forEach((r, idx) => {
      assert.ok(r.decisionId.startsWith("dec_stable_"), "Maintains deterministic id sequence under reentrancy");
    });
  });

  // 6. Provider Failure Graceful Fallback
  await suite.run("Error boundaries - Graceful fallback on API exception", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceFailing);
    const input = { key: "some_data" };

    const record = await service.recordDecision(input);

    assert.equal(record.metadata.engine, "Fallback-Static");
    assert.ok(record.reasoning.includes("Fallback deterministic analysis"), "Returns high quality local reason");
    assert.equal(record.confidence, 80, "Applies correct conservative confidence");
  });

  // 7. Malformed JSON Fallback Recovery
  await suite.run("Error boundaries - Graceful fallback on malformed JSON", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceMalformed);
    const input = { systemStatus: "CrashAlert" };

    const record = await service.recordDecision(input);

    assert.equal(record.confidence, 55, "Elevates warning and adjusts confidence down due to crash content");
    assert.ok(record.semanticTags.includes("system-failure"), "Injects system-failure tag successfully");
  });

  // 8. Timeout Recovery
  await suite.run("Timeout handling - Graceful fallback on API Timeout", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceTimeout);
    const input = { credentialsExpired: true };

    const record = await service.recordDecision(input);

    assert.equal(record.confidence, 60, "Credential issues trigger conservative confidence downgrades");
    assert.ok(record.semanticTags.includes("access-control"), "Correctly labels security access-control alerts");
  });

  // 9. Empty Input Processing
  await suite.run("Edge Cases - Empty/null inputs handling", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceFailing);

    const recordEmpty = await service.recordDecision({});
    const recordNull = await service.recordDecision(null as any);

    assert.equal(recordEmpty.decisionId, "dec_fallback_empty");
    assert.equal(recordNull.decisionId, "dec_fallback_empty");
  });

  // 10. Unicode Support
  await suite.run("Edge Cases - Unicode payload support", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);
    const unicodeInput = { utf: "繁體中文テスト", emoji: "⚡🛠️🔍" };

    const record = await service.recordDecision(unicodeInput);
    assert.equal(record.summary, "Resource optimization execution complete");
  });

  // 11. Nested Objects Processing
  await suite.run("Edge Cases - Nested object input verification", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);
    const nestedInput = {
      outer: {
        inner: {
          deepKey: "validated_value"
        }
      }
    };

    const record = await service.recordDecision(nestedInput);
    assert.equal(record.summary, "Resource optimization execution complete");
  });

  // 12. Decision History Integrity Verification
  await suite.run("Integrity - Decision History matches and persists correctly", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceHappy);

    await service.recordDecision({ id: "rec1" });
    await service.recordDecision({ id: "rec2" });

    const history = await service.getDecisionHistory();
    assert.equal(history.length, 2, "Both records must be safely committed into the repository");
    assert.ok(history[0].timestamp >= history[1].timestamp, "History is returned in descending chronological order");
  });

  // 13. Dynamic Decision Similarity Verification
  await suite.run("Similarity - Identifies previous similar decisions", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceSimilarity);

    // Seed historical decision record
    const mockRecord: DecisionRecord = {
      decisionId: "dec_stable_happy_id",
      timestamp: new Date().toISOString(),
      summary: "Resource optimization execution complete",
      reasoning: "Allocated memory threshold adjusted.",
      confidence: 95,
      riskSummary: "Low",
      semanticTags: ["optimization"],
      metadata: {}
    };
    await repo.insert("decision_records", mockRecord);

    const similarities = await service.findSimilarDecisions("Memory allocation adjustments", 3);
    assert.equal(similarities.length, 1);
    assert.equal(similarities[0].record.decisionId, "dec_stable_happy_id");
    assert.equal(similarities[0].similarityScore, 92);
  });

  // 14. Reason Evolution Analysis Verification
  await suite.run("Evolution - Evaluates reasoning shifts over time", async () => {
    const repo = new MockRepository() as any;
    const service = new DecisionLogService(repo, mockAIServiceEvolution);

    // Seed sequence
    await repo.insert("decision_records", {
      decisionId: "dec1",
      timestamp: new Date(Date.now() - 10000).toISOString(),
      summary: "First summary",
      reasoning: "Initial model launch baseline established.",
      confidence: 80,
      riskSummary: "None",
      semanticTags: ["baseline"],
      metadata: {}
    });

    await repo.insert("decision_records", {
      decisionId: "dec2",
      timestamp: new Date().toISOString(),
      summary: "Second summary",
      reasoning: "Optimized model launch based on memory threshold limits.",
      confidence: 90,
      riskSummary: "None",
      semanticTags: ["optimized"],
      metadata: {}
    });

    const evolution = await service.trackReasonEvolution();
    assert.equal(evolution.changesDetected.length, 2);
    assert.equal(evolution.confidenceTrend[0], 80, "Trend starts Chronologically");
    assert.equal(evolution.confidenceTrend[1], 90, "Trend advances Chronologically");
    assert.ok(evolution.trendSummary.includes("transitioned"), "Detailed trend summary captured");
  });

  suite.report();
}

runDecisionTests().catch((err) => {
  console.error("Fatal exception during DecisionLogService unit testing:", err);
  process.exit(1);
});
