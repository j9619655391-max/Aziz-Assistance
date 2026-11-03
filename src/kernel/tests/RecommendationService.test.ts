/**
 * @file /src/kernel/tests/RecommendationService.test.ts
 * @description Comprehensive unit and integration test suite for the RecommendationService.
 */

import { RecommendationService } from "../intelligence/RecommendationService";
import { AIService } from "../../domains/infrastructure/AIService";
import { ActionItem, BusinessImpact, RecommendationResult } from "../intelligence/types";

// Mini Custom Testing Assert and TestSuite Utilities
const assert = {
  ok: (val: any, msg?: string) => {
    if (!val) throw new Error(`${msg || "Assertion failed"}: expected truthy, got ${val}`);
  },
  equal: (a: any, b: any, msg?: string) => {
    if (a !== b) throw new Error(`${msg || "Assertion failed"}: ${a} !== ${b}`);
  },
  deepEqual: (a: any, b: any, msg?: string) => {
    const sj = JSON.stringify(a);
    const tj = JSON.stringify(b);
    if (sj !== tj) throw new Error(`${msg || "Assertion failed"}: ${sj} !== ${tj}`);
  }
};

class TestSuite {
  private total = 0;
  private passed = 0;
  private failed = 0;

  public async run(name: string, fn: () => Promise<void>) {
    this.total++;
    try {
      await fn();
      this.passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err: any) {
      this.failed++;
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message || err}`);
      if (err.stack) {
        console.error(`     ${err.stack.split("\n").slice(1, 4).join("\n")}`);
      }
    }
  }

  public report() {
    console.log(`\nTest Run Completed: ${this.passed}/${this.total} scenarios passed.`);
    if (this.failed > 0) {
      throw new Error(`TestSuite failed with ${this.failed} assertion errors.`);
    }
  }
}

// Mock Foundation Services for testing orchestration

class MockExplainabilityService {
  public called = 0;
  public async explain(decisionContext: string, inputs: any): Promise<any> {
    this.called++;
    return {
      explanation: "Mocked system explanation focusing on high-volume transactions.",
      reasoningBreakdown: ["Analyze queue size", "Scale clusters"],
      evidenceCollected: [],
      weightedContributions: [],
      alternativeOutcomes: []
    };
  }
}

class MockConfidenceService {
  public called = 0;
  public async evaluateConfidence(sourceData: any, processedOutput: any): Promise<any> {
    this.called++;
    return {
      confidencePercentage: 92,
      confidenceCategory: "High",
      confidenceFactors: [],
      uncertaintiesDetected: [],
      missingInformation: []
    };
  }
}

class MockSemanticIntelligenceService {
  public called = 0;
  public async analyzeConcept(concept: string, compareWith?: string): Promise<any> {
    this.called++;
    return {
      canonicalConcept: "Concept:" + concept,
      normalizedTerms: [concept],
      relatedConcepts: [],
      similarityScore: 88,
      confidencePercentage: 90,
      knowledgeClusters: [],
      transferableCapabilities: [],
      semanticTags: ["tag1", "tag2"],
      technologyRelationships: [],
      reasoning: "Matched concepts successfully."
    };
  }
}

class MockRiskIntelligenceService {
  public called = 0;
  public async analyzeRisk(auditContext: any): Promise<any> {
    this.called++;
    return {
      riskScore: 15,
      riskLevel: "Low",
      riskCategories: [],
      riskFactors: [],
      explanation: "Low residual threats detected.",
      mitigationSuggestions: [],
      overallRiskScore: 15,
      severity: "Low"
    };
  }
}

class MockDecisionLogService {
  public called = 0;
  public async getDecisionHistory(limit: number): Promise<any[]> {
    this.called++;
    return [
      {
        decisionId: "dec_mock_001",
        summary: "Previous memory threshold adjustment",
        timestamp: "2026-07-19T00:00:00.000Z"
      }
    ];
  }
}

const suite = new TestSuite();

async function runRecommendationTests() {
  console.log("===================================================");
  console.log("       RECOMMENDATION SERVICE UNIT TEST RUN        ");
  console.log("===================================================\n");

  // Mock AIService for Happy Path
  const mockAIServiceHappy = {
    generateContentWithFallback: async (params: any) => {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    nextBestAction: {
                      title: "Scale down active server instances",
                      description: "Lower scaling target safely as transactional rates drop below baseline constraints.",
                      priority: "Immediate",
                      rationale: "Aligns resource limits to active load metrics to conserve cost."
                    },
                    alternativeActions: [
                      {
                        title: "Decommit secondary caching tiers",
                        description: "Release transient key-value clusters to save auxiliary CPU hours.",
                        priority: "High",
                        rationale: "Ensures caching storage is proportional to concurrent traffic."
                      }
                    ],
                    businessImpact: [
                      {
                        category: "Operational Cost",
                        magnitude: "High",
                        description: "Reduces container cloud infrastructure expenses."
                      }
                    ],
                    recommendations: [
                      {
                        title: "Establish real-time metric sweeps",
                        description: "Activate periodic probes across load balancers.",
                        priority: "Medium",
                        rationale: "Gathers high-resolution data points."
                      }
                    ],
                    primaryRecommendation: "Scale down active server instances right away.",
                    alternativeRecommendations: ["Decommit secondary caching tiers"],
                    confidence: 94,
                    riskSummary: "Risk is mitigated securely.",
                    semanticSummary: "Semantic concepts resolved correctly.",
                    historicalMatches: ["dec_mock_001"],
                    reasoning: "Synthesized recommendation based on low active risk and high current confidence.",
                    evidence: ["Active load matches historical baseline patterns."]
                  })
                }
              ]
            }
          }
        ]
      };
    }
  } as unknown as AIService;

  // Mock AIService failing
  const mockAIServiceFailing = {
    generateContentWithFallback: async () => {
      throw new Error("API Provider Connection Error");
    }
  } as unknown as AIService;

  // Mock AIService returning malformed JSON
  const mockAIServiceMalformed = {
    generateContentWithFallback: async () => {
      return {
        candidates: [{ content: { parts: [{ text: "NOT VALID JSON" }] } }]
      };
    }
  } as unknown as AIService;

  // Mock AIService timing out
  const mockAIServiceTimeout = {
    generateContentWithFallback: async () => {
      return new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10));
    }
  } as unknown as AIService;

  // 1. Dependency Injection & Instantiation
  await suite.run("Dependency Injection - Instantiation & Verification", async () => {
    const explain = new MockExplainabilityService();
    const confidence = new MockConfidenceService();
    const semantic = new MockSemanticIntelligenceService();
    const risk = new MockRiskIntelligenceService();
    const decision = new MockDecisionLogService();

    const service = new RecommendationService(
      mockAIServiceHappy,
      explain,
      confidence,
      semantic,
      risk,
      decision
    );

    assert.ok(service instanceof RecommendationService, "Service instantiates perfectly");
  });

  // 2. Happy Path Orchestrated Synthesis Verification
  await suite.run("Happy Path - Parallel Orchestration & Parsing", async () => {
    const explain = new MockExplainabilityService();
    const confidence = new MockConfidenceService();
    const semantic = new MockSemanticIntelligenceService();
    const risk = new MockRiskIntelligenceService();
    const decision = new MockDecisionLogService();

    const service = new RecommendationService(
      mockAIServiceHappy,
      explain,
      confidence,
      semantic,
      risk,
      decision
    );

    const context = { concept: "Memory Threshold Scale", errorRate: 0.01 };
    const result = await service.generateRecommendations(context);

    // Verify all 5 underlying services were called concurrently
    assert.equal(explain.called, 1, "Explainability service must be called once");
    assert.equal(confidence.called, 1, "Confidence service must be called once");
    assert.equal(semantic.called, 1, "Semantic matching service must be called once");
    assert.equal(risk.called, 1, "Risk intelligence service must be called once");
    assert.equal(decision.called, 1, "Decision log history must be called once");

    // Verify output properties
    assert.equal(result.nextBestAction.title, "Scale down active server instances");
    assert.equal(result.confidence, 94);
    assert.equal(result.primaryRecommendation, "Scale down active server instances right away.");
    assert.deepEqual(result.historicalMatches, ["dec_mock_001"]);
    assert.equal(result.riskSummary, "Risk is mitigated securely.");
    assert.equal(result.semanticSummary, "Semantic concepts resolved correctly.");
  });

  // 3. Resilience to Downstream Service Failures (Partial Outage)
  await suite.run("Resilience - Gracefully handles downstream service rejections", async () => {
    const explain = {
      explain: async () => { throw new Error("Explainability offline"); }
    };
    const confidence = new MockConfidenceService();
    // Semantic fails too
    const semantic = {
      analyzeConcept: async () => { throw new Error("Semantic offline"); }
    };
    const risk = new MockRiskIntelligenceService();
    const decision = new MockDecisionLogService();

    const service = new RecommendationService(
      mockAIServiceHappy,
      explain,
      confidence,
      semantic,
      risk,
      decision
    );

    const result = await service.generateRecommendations({ concept: "Backup", errorRate: 0 });

    // Despite explainability and semantic services rejecting, the call still completes successfully
    assert.equal(confidence.called, 1);
    assert.equal(risk.called, 1);
    assert.equal(decision.called, 1);

    assert.equal(result.nextBestAction.title, "Scale down active server instances");
    assert.equal(result.confidence, 94);
  });

  // 4. Provider Connection Error Fallback
  await suite.run("Fallback - API Provider Exception trigger deterministic output", async () => {
    const explain = new MockExplainabilityService();
    const confidence = new MockConfidenceService();
    const semantic = new MockSemanticIntelligenceService();
    const risk = new MockRiskIntelligenceService();
    const decision = new MockDecisionLogService();

    const service = new RecommendationService(
      mockAIServiceFailing,
      explain,
      confidence,
      semantic,
      risk,
      decision
    );

    const context = { concept: "Telemetry sweeps", errorRate: 0.15 };
    const result = await service.generateRecommendations(context);

    // Verify fallback synthesis from the mock feeds
    assert.equal(result.nextBestAction.title, "Run automated sandbox pipeline validation");
    assert.equal(result.confidence, 92, "Should parse confidence (92) from Confidence mock");
    assert.ok(result.riskSummary.includes("Low threat level"), "Should synthesize risk levels");
    assert.ok(result.semanticSummary.includes("Concept:Telemetry sweeps"), "Should incorporate semantic results");
    assert.equal(result.historicalMatches[0], "dec_mock_001: Previous memory threshold adjustment", "Should map historical items");
  });

  // 5. Malformed JSON Response Fallback
  await suite.run("Fallback - Malformed LLM response triggers deterministic output", async () => {
    const service = new RecommendationService(mockAIServiceMalformed);
    const result = await service.generateRecommendations({ concept: "Cache sweep" });

    assert.equal(result.nextBestAction.title, "Run automated sandbox pipeline validation");
    assert.equal(result.confidence, 80, "Defaults to conservative confidence on empty context");
  });

  // 6. API Provider Timeout Fallback
  await suite.run("Fallback - Provider timeout triggers deterministic output", async () => {
    const service = new RecommendationService(mockAIServiceTimeout);
    const result = await service.generateRecommendations({ concept: "Worker allocation" });

    assert.equal(result.nextBestAction.title, "Run automated sandbox pipeline validation");
    assert.ok(result.reasoning.includes("deterministic"), "Correctly indicates fallback execution path");
  });

  // 7. Edge Case - Empty statusContext
  await suite.run("Edge Cases - Handles completely empty statusContext payload", async () => {
    const service = new RecommendationService(mockAIServiceFailing);
    const result = await service.generateRecommendations({});

    assert.equal(result.nextBestAction.title, "Run automated sandbox pipeline validation");
    assert.equal(result.confidence, 80);
    assert.ok(Array.isArray(result.alternativeActions));
  });

  // 8. Edge Case - Unicode and Nested Payload support
  await suite.run("Edge Cases - Handles Unicode emoji and nested payload objects", async () => {
    const service = new RecommendationService(mockAIServiceHappy);
    const result = await service.generateRecommendations({
      concept: "🔥 Scaling 🚀",
      meta: {
        nested: {
          key: "value"
        }
      }
    });

    assert.equal(result.nextBestAction.title, "Scale down active server instances");
    assert.equal(result.confidence, 94);
  });

  suite.report();
}

runRecommendationTests().catch((err) => {
  console.error("Fatal exception during RecommendationService unit testing:", err);
  process.exit(1);
});
