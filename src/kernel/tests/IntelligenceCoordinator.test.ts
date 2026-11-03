/**
 * @file /src/kernel/tests/IntelligenceCoordinator.test.ts
 * @description Comprehensive unit and integration test suite for the IntelligenceCoordinator.
 */

import { IntelligenceCoordinator } from "../intelligence/IntelligenceCoordinator";
import {
  ISemanticIntelligenceService,
  IConfidenceService,
  IRiskIntelligenceService,
  IExplainabilityService,
  IDecisionLogService,
  IRecommendationService,
  SemanticIntelligenceResult,
  ConfidenceResult,
  RiskAnalysisResult,
  ExplanationResult,
  DecisionRecord,
  RecommendationResult
} from "../intelligence/types";

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

// ==========================================
// MOCK FOUNDATION SERVICES FOR TESTING
// ==========================================

class MockSemanticService implements ISemanticIntelligenceService {
  public called = 0;
  public lastConcept: string | null = null;
  public lastCompareWith: string | undefined = undefined;

  public async analyzeConcept(concept: string, compareWith?: string): Promise<SemanticIntelligenceResult> {
    this.called++;
    this.lastConcept = concept;
    this.lastCompareWith = compareWith;
    return {
      canonicalConcept: `Canonical:${concept}`,
      normalizedTerms: [concept],
      relatedConcepts: ["concept-b"],
      similarityScore: 85,
      confidencePercentage: 90,
      knowledgeClusters: ["cluster-a"],
      transferableCapabilities: ["skill-a"],
      semanticTags: ["tag-a"],
      technologyRelationships: [],
      reasoning: "Matched concepts successfully in mock."
    };
  }
}

class MockConfidenceService implements IConfidenceService {
  public called = 0;
  public lastSourceData: any = null;

  public async evaluateConfidence(sourceData: any, processedOutput: any): Promise<any> {
    this.called++;
    this.lastSourceData = sourceData;
    return {
      confidencePercentage: 95,
      confidenceCategory: "High",
      confidenceFactors: ["good-inputs"],
      uncertaintiesDetected: [],
      missingInformation: []
    };
  }
}

class MockRiskService implements IRiskIntelligenceService {
  public called = 0;
  public lastAuditContext: any = null;

  public async analyzeRisk(auditContext: any): Promise<RiskAnalysisResult> {
    this.called++;
    this.lastAuditContext = auditContext;
    return {
      riskScore: 10,
      riskLevel: "Low",
      riskCategories: [],
      riskFactors: [],
      explanation: "Low risk verified in mock.",
      mitigationSuggestions: [],
      overallRiskScore: 10,
      severity: "Low",
      probability: 10,
      confidencePercentage: 90,
      evidence: [],
      mitigations: [],
      reasoning: "Reasoning for low risk."
    };
  }
}

class MockExplainService implements IExplainabilityService {
  public called = 0;
  public lastDecisionContext: string | null = null;
  public lastInputs: any = null;

  public async explain(decisionContext: string, inputs: Record<string, any>): Promise<any> {
    this.called++;
    this.lastDecisionContext = decisionContext;
    this.lastInputs = inputs;
    return {
      explanation: "Explanation computed cleanly.",
      reasoningBreakdown: ["step-1"],
      evidenceCollected: ["input-evidence"],
      weightedContributions: [],
      alternativeOutcomes: []
    };
  }
}

class MockDecisionLogService implements IDecisionLogService {
  public called = 0;
  public lastLimit: number | undefined = undefined;

  public async getDecisionHistory(limit?: number): Promise<DecisionRecord[]> {
    this.called++;
    this.lastLimit = limit;
    return [
      {
        decisionId: "dec_mock_123",
        timestamp: "2026-07-19T00:00:00Z",
        summary: "Previous memory threshold adjustment",
        reasoning: "Adjusted memory allocation under heavy loads.",
        confidence: 94,
        riskSummary: "Risk managed.",
        semanticTags: ["mem"],
        metadata: {}
      }
    ];
  }

  public async logDecision(entry: any): Promise<any> { return {} as any; }
  public async getLogs(): Promise<any[]> { return []; }
  public async recordDecision(input: any): Promise<any> { return {} as any; }
  public async findSimilarDecisions(): Promise<any[]> { return []; }
  public async trackReasonEvolution(): Promise<any> { return {} as any; }
}

class MockRecommendationService implements IRecommendationService {
  public called = 0;
  public lastStatusContext: any = null;

  public async generateRecommendations(statusContext: any): Promise<RecommendationResult> {
    this.called++;
    this.lastStatusContext = statusContext;
    return {
      nextBestAction: {
        title: "Scale down active server instances",
        description: "Lower scaling target safely as transactional rates drop.",
        priority: "Immediate",
        rationale: "Saves infrastructure budget."
      },
      alternativeActions: [],
      businessImpact: [],
      recommendations: [
        {
          title: "Scale down active server instances",
          description: "Lower scaling target safely as transactional rates drop.",
          priority: "Immediate",
          rationale: "Saves infrastructure budget."
        }
      ],
      primaryRecommendation: "Scale down active server instances right away.",
      alternativeRecommendations: [],
      confidence: 95,
      riskSummary: "Risk is mitigated.",
      semanticSummary: "Concepts matched.",
      historicalMatches: ["dec_mock_123"],
      reasoning: "Recommendation generated securely.",
      evidence: ["No anomalies detected."]
    };
  }
}

// ==========================================
// MAIN TEST SUITE RUNNER
// ==========================================

const suite = new TestSuite();

async function runCoordinatorTests() {
  console.log("===================================================");
  console.log("       INTELLIGENCE COORDINATOR UNIT TEST RUN      ");
  console.log("===================================================\n");

  // Scenario 1: Dependency Injection - Instantiation & Verification
  await suite.run("Dependency Injection - Instantiation & Verification", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    const risk = new MockRiskService();
    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, risk, exp, dec, rec);
    assert.ok(coordinator instanceof IntelligenceCoordinator, "Should instantiate correctly.");
  });

  // Scenario 2: Happy Path - Parallel Orchestration & Parsing
  await suite.run("Happy Path - Parallel Orchestration & Parsing", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    const risk = new MockRiskService();
    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, risk, exp, dec, rec);
    const inputPayload = {
      concept: "Kubernetes Cluster",
      title: "Production Scaling",
      compareWith: "Docker swarm",
      processedOutput: { activeNodes: 24 }
    };

    const result = await coordinator.coordinate(inputPayload);

    // Verify step executions
    assert.equal(sem.called, 1, "Semantic service should be called exactly once.");
    assert.equal(conf.called, 1, "Confidence service should be called exactly once.");
    assert.equal(risk.called, 1, "Risk service should be called exactly once.");
    assert.equal(exp.called, 1, "Explain service should be called exactly once.");
    assert.equal(dec.called, 1, "Decision log history retrieval should be called exactly once.");
    assert.equal(rec.called, 1, "Recommendation service should be called exactly once.");

    // Verify Unified Result mapping
    assert.ok(result.correlationId, "Correlation ID should be auto-generated.");
    assert.ok(result.timestamp, "Timestamp should be generated.");
    assert.equal(result.pipelineStatus, "SUCCESS", "Pipeline status should be SUCCESS on happy path.");
    assert.equal(result.semantic.canonicalConcept, "Canonical:Kubernetes Cluster", "Semantic result correctly mapped.");
    assert.equal(result.confidence.confidencePercentage, 95, "Confidence result correctly mapped.");
    assert.equal(result.risk.riskLevel, "Low", "Risk level correctly mapped.");
    assert.equal(result.explanation.explanation, "Explanation computed cleanly.", "Explanation result correctly mapped.");
    assert.equal(result.decisionHistory.length, 1, "Decision history list populated.");
    assert.equal(result.recommendations.confidence, 95, "Recommendations compiled successfully.");

    // Verify trace generation
    assert.equal(result.pipelineTrace[0], "PipelineStarted");
    assert.ok(result.pipelineTrace.includes("SemanticCompleted"), "Trace should log SemanticCompleted");
    assert.ok(result.pipelineTrace.includes("ConfidenceCompleted"), "Trace should log ConfidenceCompleted");
    assert.ok(result.pipelineTrace.includes("RiskCompleted"), "Trace should log RiskCompleted");
    assert.ok(result.pipelineTrace.includes("ExplainabilityCompleted"), "Trace should log ExplainabilityCompleted");
    assert.ok(result.pipelineTrace.includes("DecisionHistoryLoaded"), "Trace should log DecisionHistoryLoaded");
    assert.ok(result.pipelineTrace.includes("RecommendationCompleted"), "Trace should log RecommendationCompleted");
    assert.equal(result.pipelineTrace[result.pipelineTrace.length - 1], "PipelineFinished");

    // Verify execution metrics
    assert.ok(result.executionMetrics.executionTime >= 0, "Execution time should be non-negative.");
    assert.ok(result.executionMetrics.pipelineLatency >= 0, "Pipeline latency should be non-negative.");
    assert.equal(result.executionMetrics.fallbackTriggered, false, "Fallback triggered flag should be false.");
    assert.equal(result.executionMetrics.errorCount, 0, "Error count should be 0.");
    assert.equal(result.executionMetrics.timeoutCount, 0, "Timeout count should be 0.");
  });

  // Scenario 3: Correlation ID propagation
  await suite.run("Correlation ID propagation", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    const risk = new MockRiskService();
    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, risk, exp, dec, rec);
    const customCorrelationId = "custom_correlation_id_sprint17";
    
    const result = await coordinator.coordinate({
      correlationId: customCorrelationId,
      concept: "Trace Testing"
    });

    assert.equal(result.correlationId, customCorrelationId, "Correlation ID should match requested custom ID.");
    // Propagated to Confidence
    assert.equal(conf.lastSourceData.correlationId, customCorrelationId, "Propagated to Confidence source data.");
    // Propagated to Risk
    assert.equal(risk.lastAuditContext.correlationId, customCorrelationId, "Propagated to Risk audit context.");
    // Propagated to Explainability
    assert.equal(exp.lastInputs.correlationId, customCorrelationId, "Propagated to Explainability inputs.");
    // Propagated to Recommendation
    assert.equal(rec.lastStatusContext.correlationId, customCorrelationId, "Propagated to Recommendation status context.");
  });

  // Scenario 4: Partial Failure Recovery
  await suite.run("Partial Failure Recovery (One or more services failing)", async () => {
    const sem = new MockSemanticService();
    
    // Fail risk service
    const failingRisk: IRiskIntelligenceService = {
      analyzeRisk: async () => { throw new Error("Risk database disconnected"); }
    };
    
    // Fail explain service
    const failingExplain: IExplainabilityService = {
      explain: async () => { throw new Error("Explain provider outage"); }
    };

    const conf = new MockConfidenceService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, failingRisk, failingExplain, dec, rec);
    const result = await coordinator.coordinate({ concept: "Resilience Testing" });

    // Assert pipeline did not crash
    assert.equal(result.pipelineStatus, "PARTIAL_SUCCESS", "Pipeline status should degrade to PARTIAL_SUCCESS.");
    assert.equal(result.risk, null, "Failed service should return fallback null.");
    assert.equal(result.explanation, null, "Failed service should return fallback null.");
    assert.equal(result.semantic.canonicalConcept, "Canonical:Resilience Testing", "Surviving services still succeed.");
    assert.equal(result.executionMetrics.fallbackTriggered, true, "Fallback triggered flag should be true.");
    assert.equal(result.executionMetrics.errorCount, 2, "Error count should be 2.");
  });

  // Scenario 5: Timeout Recovery
  await suite.run("Timeout Recovery", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    
    // Slow risk service that exceeds timeout
    const slowRisk: IRiskIntelligenceService = {
      analyzeRisk: async () => {
        return new Promise<any>((resolve) => {
          setTimeout(() => {
            resolve({ riskLevel: "Medium" } as any);
          }, 300); // 300ms delay
        });
      }
    };

    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, slowRisk, exp, dec, rec);
    
    // Set low timeoutMs to trigger timeout condition
    const result = await coordinator.coordinate({
      concept: "Timeout Testing",
      timeoutMs: 50 // 50ms timeout limit
    });

    assert.equal(result.pipelineStatus, "PARTIAL_SUCCESS", "Should register as partial success on timeout.");
    assert.equal(result.risk, null, "Timed out service should fallback gracefully.");
    assert.equal(result.executionMetrics.timeoutCount, 1, "Timeout count should be incremented.");
    assert.equal(result.executionMetrics.fallbackTriggered, true, "Fallback flag should be true.");
  });

  // Scenario 6: High Concurrency Load Test (100 concurrent requests)
  await suite.run("High Concurrency Load Test (100 concurrent requests)", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    const risk = new MockRiskService();
    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, risk, exp, dec, rec);

    const concurrentRequests = 100;
    const promises: Array<Promise<any>> = [];

    const startTime = Date.now();
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(
        coordinator.coordinate({
          concept: `Concurrency-${i}`,
          requestId: i
        })
      );
    }

    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;

    assert.equal(results.length, concurrentRequests, "Should have received exactly 100 results.");
    
    // Check for thread-safety and unique correlation IDs
    const correlationIds = new Set<string>();
    results.forEach((res, index) => {
      assert.equal(res.pipelineStatus, "SUCCESS", `Request ${index} failed.`);
      assert.ok(res.correlationId, `Request ${index} has no correlationId.`);
      correlationIds.add(res.correlationId);
    });

    assert.equal(correlationIds.size, concurrentRequests, "All 100 correlation IDs must be unique.");
    console.log(`    [STATS] Processed ${concurrentRequests} orchestrations in ${duration}ms. Avg: ${(duration/concurrentRequests).toFixed(2)}ms/req`);
  });

  // Scenario 7: Statelessness and Thread Safety
  await suite.run("Statelessness and Thread Safety", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    const risk = new MockRiskService();
    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, risk, exp, dec, rec);

    // Call twice with different payloads and verify they do not bleed into each other
    const resA = await coordinator.coordinate({ concept: "Apple" });
    const resB = await coordinator.coordinate({ concept: "Banana" });

    assert.equal(resA.semantic.canonicalConcept, "Canonical:Apple", "Payload A concept correct.");
    assert.equal(resB.semantic.canonicalConcept, "Canonical:Banana", "Payload B concept correct.");
    assert.ok(resA.correlationId !== resB.correlationId, "Correlation IDs must be unique.");
  });

  // Scenario 8: Edge Cases (Empty Input, Unicode, Nested Objects)
  await suite.run("Edge Cases (Empty Input, Unicode, Nested Objects)", async () => {
    const sem = new MockSemanticService();
    const conf = new MockConfidenceService();
    const risk = new MockRiskService();
    const exp = new MockExplainService();
    const dec = new MockDecisionLogService();
    const rec = new MockRecommendationService();

    const coordinator = new IntelligenceCoordinator(sem, conf, risk, exp, dec, rec);

    // Empty input
    const resEmpty = await coordinator.coordinate({});
    assert.equal(resEmpty.pipelineStatus, "SUCCESS");

    // Unicode & emojis
    const resUnicode = await coordinator.coordinate({
      concept: "🚀 AI Kernel Core 🤖",
      nested: {
        payload: {
          deepKey: "🌟 Unicode Content 🌟"
        }
      }
    });
    assert.equal(resUnicode.pipelineStatus, "SUCCESS");
    assert.equal(resUnicode.semantic.canonicalConcept, "Canonical:🚀 AI Kernel Core 🤖");
  });

  // Report final results
  suite.report();
}

runCoordinatorTests().catch((err) => {
  console.error("Test execution crashed:", err);
  process.exit(1);
});
