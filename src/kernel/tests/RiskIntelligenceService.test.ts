/**
 * @file /src/kernel/tests/RiskIntelligenceService.test.ts
 * @description Comprehensive unit and integration test suite for the RiskIntelligenceService.
 * Verifies dependency injection, stateless concurrency, happy path structured LLM parsing,
 * error boundaries, unicode support, nested objects support, timeouts, conservative risk estimations,
 * and dynamic high-quality fallback behaviors.
 */

import { RiskIntelligenceService } from "../intelligence/RiskIntelligenceService";
import { AIService } from "../../domains/infrastructure/AIService";
import { RiskAnalysisResult } from "../intelligence/types";

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
    console.log(`Risk Intelligence Service Unit Tests Complete.`);
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

async function runRiskTests() {
  console.log("===================================================");
  console.log("       RISK INTELLIGENCE SERVICE UNIT TEST RUN      ");
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
                    riskScore: 25,
                    riskLevel: "Low",
                    overallRiskScore: 25,
                    severity: "Low",
                    probability: 15,
                    confidencePercentage: 90,
                    explanation: "Normal system operations with negligible warnings.",
                    reasoning: "The audit context contains well-formed credentials and standardized components.",
                    evidence: ["All keys are fully satisfied"],
                    riskCategories: [
                      { category: "Operational", score: 10 },
                      { category: "Technical", score: 20 }
                    ],
                    riskFactors: [
                      {
                        factor: "Standard payload mapping",
                        riskCategory: "Technical",
                        severity: "Minor",
                        explanation: "A standard mock risk factor."
                      }
                    ],
                    mitigationSuggestions: [
                      {
                        riskFactor: "Standard payload mapping",
                        actionableMitigation: "Ensure standard monitoring runs.",
                        priority: "Low"
                      }
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

  // Mock Failing LLM response
  const mockAIServiceFailing = {
    generateContentWithFallback: async () => {
      throw new Error("Provider Outage: LLM Unavailable");
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
                  text: "{ riskScore: malformed, unclosed_brackets "
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
      throw new Error("API Connection Timeout (504)");
    },
    getClient: () => ({})
  } as unknown as AIService;

  // 1. Dependency Injection Test
  await suite.run("Dependency Injection - Instantiation", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    assert.ok(service instanceof RiskIntelligenceService, "Service should instantiate correctly");
  });

  // 2. Happy Path Structured Parsing
  await suite.run("Happy Path - Strict JSON Parse & Schema Match", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    const auditContext = { id: "test-01", status: "Active" };
    
    const result = await service.analyzeRisk(auditContext);

    assert.equal(result.riskScore, 25);
    assert.equal(result.riskLevel, "Low");
    assert.equal(result.overallRiskScore, 25);
    assert.equal(result.severity, "Low");
    assert.equal(result.probability, 15);
    assert.equal(result.confidencePercentage, 90);
    assert.equal(result.explanation, "Normal system operations with negligible warnings.");
    assert.equal(result.evidence[0], "All keys are fully satisfied");
    assert.equal(result.riskCategories[0].category, "Operational");
    assert.equal(result.riskFactors[0].factor, "Standard payload mapping");
    assert.equal(result.mitigationSuggestions[0].priority, "Low");
  });

  // 3. Schema Validation Checks
  await suite.run("Schema Validation - Verification of output interface", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    const result = await service.analyzeRisk({ test: true });

    assert.ok(typeof result.overallRiskScore === "number", "overallRiskScore must be number");
    assert.ok(Array.isArray(result.evidence), "evidence must be an array");
    assert.ok(Array.isArray(result.riskCategories), "riskCategories must be an array");
    assert.ok(Array.isArray(result.riskFactors), "riskFactors must be an array");
    assert.ok(Array.isArray(result.mitigationSuggestions), "mitigationSuggestions must be an array");
    assert.ok(typeof result.reasoning === "string", "reasoning must be a string");
  });

  // 4. Stateless Execution Check
  await suite.run("Statelessness - Independent executions", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    
    const res1 = await service.analyzeRisk({ key: 1 });
    const res2 = await service.analyzeRisk({ key: 2 });

    assert.equal(res1.riskScore, res2.riskScore, "Stateless runs produce consistent, independent structures");
  });

  // 5. Thread Safety & Parallel Requests
  await suite.run("Thread Safety - Concurrent requests are safe", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    
    const promises = Array.from({ length: 5 }).map((_, idx) => 
      service.analyzeRisk({ idx })
    );

    const results = await Promise.all(promises);
    assert.equal(results.length, 5, "Successfully handles parallel/concurrent executions");
    results.forEach((res) => {
      assert.equal(res.overallRiskScore, 25);
    });
  });

  // 6. Provider Failure Graceful Fallback
  await suite.run("Error boundaries - Graceful fallback on API exception", async () => {
    const service = new RiskIntelligenceService(mockAIServiceFailing);
    const result = await service.analyzeRisk({ id: "sys-09", version: "1.0", status: "Active", environment: "Production", auth: "Secure" });

    assert.equal(result.riskScore, 20);
    assert.equal(result.riskLevel, "Low");
    assert.equal(result.severity, "Low");
    assert.ok(result.reasoning.includes("conservative risk calculation"), "Fallback reasoning matches standard");
  });

  // 7. Malformed JSON Fallback Recovery
  await suite.run("Error boundaries - Graceful fallback on malformed JSON", async () => {
    const service = new RiskIntelligenceService(mockAIServiceMalformed);
    const result = await service.analyzeRisk({ environment: "Production" });

    assert.ok(result.riskScore > 20, "Lack of expected parameters inflates score conservatively");
    assert.ok(result.evidence.some(e => e.includes("Missing expected primary system parameter")), "Identifies missing parameters successfully");
  });

  // 8. Timeout Recovery
  await suite.run("Timeout handling - Graceful fallback on API Timeout", async () => {
    const service = new RiskIntelligenceService(mockAIServiceTimeout);
    const result = await service.analyzeRisk({ id: "t-1", error: "Connection lost" });

    assert.ok(result.riskScore >= 40, "Error logs present inflates fallback risk score conservatively");
    assert.ok(result.riskFactors.some(f => f.factor === "Runtime Operational Failures"), "Identifies failure risk correctly");
  });

  // 9. Empty Input Processing
  await suite.run("Edge Cases - Empty/null inputs handling", async () => {
    const service = new RiskIntelligenceService(mockAIServiceFailing);
    
    const resultNull = await service.analyzeRisk(null);
    const resultEmpty = await service.analyzeRisk({});

    assert.equal(resultNull.riskScore, 75);
    assert.equal(resultNull.severity, "Critical");
    assert.equal(resultNull.riskFactors[0].factor, "Lack of Contextual Input");

    assert.equal(resultEmpty.riskScore, 75);
    assert.equal(resultEmpty.severity, "Critical");
    assert.equal(resultEmpty.riskFactors[0].factor, "Lack of Contextual Input");
  });

  // 10. Unicode Support
  await suite.run("Edge Cases - Unicode payload support", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    const unicodeContext = { label: "日本語の例外", emoji: "💥☣️🔥" };

    const result = await service.analyzeRisk(unicodeContext);
    assert.equal(result.overallRiskScore, 25);
  });

  // 11. Large Context Processing
  await suite.run("Edge Cases - Large Context inputs processing", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    const largeContext = {
      payload: "B".repeat(6000),
      systemID: "sys-large-99"
    };

    const result = await service.analyzeRisk(largeContext);
    assert.equal(result.overallRiskScore, 25);
  });

  // 12. Nested Objects Processing
  await suite.run("Edge Cases - Nested object input verification", async () => {
    const service = new RiskIntelligenceService(mockAIServiceHappy);
    const nestedContext = {
      meta: {
        host: "AWS-Cluster",
        credentials: { expired: true }
      },
      tags: ["legacy-deployment"]
    };

    const result = await service.analyzeRisk(nestedContext);
    assert.equal(result.overallRiskScore, 25);
  });

  // 13. Conservative Risk Estimation Heuristics (Security context check)
  await suite.run("Conservative Risk Estimation - Credential exposure identification", async () => {
    const service = new RiskIntelligenceService(mockAIServiceFailing);
    const result = await service.analyzeRisk({
      id: "auth-service",
      authToken: "secret_token_abc123"
    });

    assert.ok(result.overallRiskScore >= 50, "Credential keywords must elevate conservative score");
    assert.ok(result.riskFactors.some(f => f.factor === "Credential Exposure Vector"), "Identifies credential risks successfully");
    assert.ok(result.riskCategories.some(c => c.category === "Security" && c.score > 50), "Escalates Security category specific score");
  });

  suite.report();
}

runRiskTests().catch((err) => {
  console.error("Fatal exception during RiskIntelligenceService unit testing:", err);
  process.exit(1);
});
