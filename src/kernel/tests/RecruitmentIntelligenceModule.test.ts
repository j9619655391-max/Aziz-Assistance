/**
 * @file /src/kernel/tests/RecruitmentIntelligenceModule.test.ts
 * @description Unit and performance test suite for the RecruitmentIntelligenceModule.
 */

import { RecruitmentIntelligenceModule, CandidateProfile, JobDescription } from "../../domains/recruitment/RecruitmentIntelligenceModule";
import { IIntelligenceCoordinator, UnifiedIntelligenceResult } from "../intelligence/types";

// Mini assert utility
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
// MOCK INTELLIGENCE COORDINATOR FOR TESTING
// ==========================================

class MockIntelligenceCoordinator implements IIntelligenceCoordinator {
  public calledCount = 0;
  public forceFailure = false;
  public forcePartialSuccess = false;
  public simulatedLatencyMs = 0;

  public async coordinate(input: Record<string, any>): Promise<UnifiedIntelligenceResult> {
    this.calledCount++;

    if (this.simulatedLatencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.simulatedLatencyMs));
    }

    if (this.forceFailure) {
      throw new Error("Simulated Coordinator Hard Crash");
    }

    const candidateSkills: string[] = input.processedOutput?.candidateSkills || [];
    const jobSkills: string[] = input.processedOutput?.jobSkills || [];
    const candExp: number = input.processedOutput?.experienceYears || 0;
    const minExp: number = input.processedOutput?.minimumExperienceYears || 0;

    // Standard similarity logic based on input skills intersection
    const intersection = candidateSkills.filter(s => jobSkills.includes(s));
    let mockSimilarity = 50;
    if (jobSkills.length === 0) {
      mockSimilarity = 100;
    } else {
      mockSimilarity = Math.round((intersection.length / jobSkills.length) * 100);
    }

    // Adjust score based on experience
    if (candExp >= minExp) {
      mockSimilarity = Math.min(100, mockSimilarity + 10);
    } else {
      mockSimilarity = Math.max(0, mockSimilarity - 20);
    }

    if (this.forcePartialSuccess) {
      return {
        correlationId: input.correlationId || "partial-trace-123",
        timestamp: new Date().toISOString(),
        pipelineStatus: "PARTIAL_SUCCESS",
        semantic: {
          canonicalConcept: `CanonicalMatch`,
          normalizedTerms: candidateSkills,
          relatedConcepts: [],
          similarityScore: mockSimilarity,
          confidencePercentage: 80,
          knowledgeClusters: [],
          transferableCapabilities: ["Strategic-Thinking"],
          semanticTags: ["PartialMatched"],
          technologyRelationships: [],
          reasoning: "Semantic parsed partially."
        },
        confidence: {
          confidencePercentage: 75,
          confidenceCategory: "Medium",
          confidenceFactors: ["Partial indicators matched"],
          uncertaintiesDetected: ["Missing risk provider info"],
          missingInformation: ["Risk profile offline"]
        },
        risk: null as any, // Missing risk block entirely
        explanation: null as any, // Missing explain block entirely
        decisionHistory: [],
        recommendations: {
          nextBestAction: {
            title: "Manual assessment",
            description: "Some models failed. Manually audit requirements.",
            priority: "Medium",
            rationale: "Information incomplete."
          },
          alternativeActions: [],
          businessImpact: [],
          recommendations: [],
          primaryRecommendation: "Conduct manual human screening.",
          alternativeRecommendations: [],
          confidence: 70,
          riskSummary: "Unknown due to fallback.",
          semanticSummary: "Partial skills aligned.",
          historicalMatches: [],
          reasoning: "Failsafe trigger recommendation.",
          evidence: []
        },
        pipelineTrace: ["PipelineStarted", "SemanticCompleted", "ConfidenceCompleted", "RiskFailed", "ExplainFailed", "PipelineFinished"],
        executionMetrics: {
          executionTime: 12,
          pipelineLatency: 12,
          fallbackTriggered: true,
          errorCount: 2,
          timeoutCount: 0,
          perServiceLatency: {},
          memoryEstimate: 0,
          providerUsed: "MockCoordinator"
        }
      };
    }

    // Happy Path
    return {
      correlationId: input.correlationId || "trace-123",
      timestamp: new Date().toISOString(),
      pipelineStatus: "SUCCESS",
      semantic: {
        canonicalConcept: `CanonicalCandidateMatch`,
        normalizedTerms: candidateSkills,
        relatedConcepts: ["adjacent-skills"],
        similarityScore: mockSimilarity,
        confidencePercentage: 90,
        knowledgeClusters: ["cluster-a"],
        transferableCapabilities: ["Adaptability", "Cross-Domain-Agility"],
        semanticTags: ["IT-Skillset"],
        technologyRelationships: [],
        reasoning: "Deep semantic skill match analyzed."
      },
      confidence: {
        confidencePercentage: candExp >= minExp ? 95 : 60,
        confidenceCategory: candExp >= minExp ? "High" : "Low",
        confidenceFactors: ["Skills aligned", "Experience criteria met"],
        uncertaintiesDetected: [],
        missingInformation: []
      },
      risk: {
        riskScore: candExp >= minExp ? 5 : 45,
        riskLevel: candExp >= minExp ? "Low" : "Medium",
        riskCategories: [],
        riskFactors: candExp >= minExp ? [] : ["Insufficient experience levels detected"],
        explanation: candExp >= minExp ? "Low recruitment risk." : "Risk of higher ramp-up time.",
        mitigationSuggestions: [],
        overallRiskScore: candExp >= minExp ? 5 : 45,
        severity: candExp >= minExp ? "Low" : "Medium",
        probability: candExp >= minExp ? 10 : 50,
        confidencePercentage: 95,
        evidence: [],
        mitigations: [],
        reasoning: "Risk evaluated based on qualifications."
      },
      explanation: {
        explanation: `Candidate meets ${intersection.length} of ${jobSkills.length} required skills. Experience gap is ${Math.max(0, minExp - candExp)} years.`,
        reasoningBreakdown: ["Loaded skills", "Analyzed experience thresholds"],
        evidenceCollected: ["Resume text match"],
        weightedContributions: [],
        alternativeOutcomes: []
      },
      decisionHistory: [
        {
          decisionId: "dec_prev_101",
          timestamp: "2026-07-18T12:00:00Z",
          summary: "Recruited similar developer profile",
          reasoning: "Prior software architect matched 90%.",
          confidence: 90,
          riskSummary: "None",
          semanticTags: ["Developer"],
          metadata: {}
        }
      ],
      recommendations: {
        nextBestAction: {
          title: "Schedule Technical Assessment",
          description: "Initiate next round for high similarity.",
          priority: "Immediate",
          rationale: "Exceeds candidate benchmarks."
        },
        alternativeActions: [],
        businessImpact: [],
        recommendations: [],
        primaryRecommendation: candExp >= minExp ? "Proceed to direct manager interview." : "Proceed with custom technical ramp-up program.",
        alternativeRecommendations: [],
        confidence: 90,
        riskSummary: "Risk is low.",
        semanticSummary: "Highly aligned tags.",
        historicalMatches: ["dec_prev_101"],
        reasoning: "Candidate is a highly viable prospect.",
        evidence: []
      },
      pipelineTrace: ["PipelineStarted", "SemanticCompleted", "ConfidenceCompleted", "RiskCompleted", "ExplainCompleted", "DecisionHistoryLoaded", "RecommendationCompleted", "PipelineFinished"],
      executionMetrics: {
        executionTime: 45,
        pipelineLatency: 45,
        fallbackTriggered: false,
        errorCount: 0,
        timeoutCount: 0,
        perServiceLatency: {},
        memoryEstimate: 0,
        providerUsed: "MockCoordinator"
      }
    };
  }
}

// ==========================================
// TEST SCENARIOS RUNNER
// ==========================================

const suite = new TestSuite();

async function runRecruitmentModuleTests() {
  console.log("===================================================");
  console.log("     RECRUITMENT INTELLIGENCE PLATFORM TESTS       ");
  console.log("===================================================\n");

  const coordinator = new MockIntelligenceCoordinator();
  const recruitmentModule = new RecruitmentIntelligenceModule(coordinator);

  // Scenario 1: Perfect Match
  await suite.run("Perfect Match (Full skills overlap & sufficient experience)", async () => {
    coordinator.forceFailure = false;
    coordinator.forcePartialSuccess = false;

    const candidate: CandidateProfile = {
      name: "Satoshi Nakamoto",
      skills: ["TypeScript", "React", "NodeJS", "Cryptography"],
      experienceYears: 8,
      experienceSummary: "Developed decentralized scalable ledger solutions using TypeScript and React."
    };

    const job: JobDescription = {
      title: "Senior Fullstack Engineer",
      requiredSkills: ["typescript", "react", "nodejs"],
      minimumExperienceYears: 5
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.ok(result.candidateScore >= 80, `Expected high candidate score, got: ${result.candidateScore}`);
    assert.equal(result.matchingSkills.length, 3, "All required skills should be matched.");
    assert.equal(result.missingSkills.length, 0, "No skills should be missing.");
    assert.deepEqual(result.transferableSkills, ["Adaptability", "Cross-Domain-Agility"]);
    assert.equal(result.confidence, 95, "Confidence percentage should be high (95).");
    assert.equal(result.decisionHistoryReference.length, 1, "Should carry decision history trace.");
  });

  // Scenario 2: Partial Match
  await suite.run("Partial Match (Some matching skills & some experience)", async () => {
    const candidate: CandidateProfile = {
      name: "Ada Lovelace",
      skills: ["Python", "C++", "React"],
      experienceYears: 3,
      experienceSummary: "Algorithmic designer with partial React knowledge."
    };

    const job: JobDescription = {
      title: "Fullstack Web Developer",
      requiredSkills: ["React", "TypeScript", "NodeJS"],
      minimumExperienceYears: 4
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.ok(result.candidateScore >= 40 && result.candidateScore < 80, `Expected medium score for partial match, got: ${result.candidateScore}`);
    assert.equal(result.matchingSkills.length, 1, "Should have exactly 1 matching skill.");
    assert.equal(result.missingSkills.length, 2, "Should have 2 missing skills.");
    assert.equal(result.confidence, 60, "Confidence should degrade due to experience gap.");
    assert.ok(result.riskSummary.includes("Risk of higher ramp-up time"), "Should flags appropriate risk.");
  });

  // Scenario 3: Poor Match
  await suite.run("Poor Match (Zero skills matched & insufficient experience)", async () => {
    const candidate: CandidateProfile = {
      name: "Alan Turing",
      skills: ["Mathematics", "Deciphering", "Pencil"],
      experienceYears: 1,
      experienceSummary: "Theoretical computations specialist."
    };

    const job: JobDescription = {
      title: "React Frontend Engineer",
      requiredSkills: ["React", "CSS", "HTML5"],
      minimumExperienceYears: 5
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.ok(result.candidateScore < 40, `Expected low score for poor match, got: ${result.candidateScore}`);
    assert.equal(result.matchingSkills.length, 0, "No skills matched.");
    assert.equal(result.missingSkills.length, 3, "All skills missing.");
  });

  // Scenario 4: Empty Resume
  await suite.run("Empty Resume (Graceful handling of null/empty profile attributes)", async () => {
    const candidate: CandidateProfile = {
      name: "",
      skills: [],
      experienceYears: 0
    };

    const job: JobDescription = {
      title: "React Specialist",
      requiredSkills: ["React"],
      minimumExperienceYears: 2
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.ok(result.candidateScore >= 0, "Score should handle empty values safely.");
    assert.equal(result.matchingSkills.length, 0);
    assert.equal(result.missingSkills.length, 1);
  });

  // Scenario 5: Empty Job Description
  await suite.run("Empty Job Description (No skills or experience required)", async () => {
    const candidate: CandidateProfile = {
      name: "Bob",
      skills: ["Python"],
      experienceYears: 2
    };

    const job: JobDescription = {
      title: "",
      requiredSkills: [],
      minimumExperienceYears: 0
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.ok(result.candidateScore >= 90, "Score should be high if nothing is required.");
    assert.equal(result.matchingSkills.length, 0);
    assert.equal(result.missingSkills.length, 0);
  });

  // Scenario 6: Unicode & Emoji Support
  await suite.run("Unicode Support (Special characters and emojis in inputs)", async () => {
    const candidate: CandidateProfile = {
      name: "🚀 Super Coder 🤖",
      skills: ["TypeScript ✨", "React ⚛️"],
      experienceYears: 5,
      experienceSummary: "Build beautiful layouts on ☁️ Cloud servers."
    };

    const job: JobDescription = {
      title: "Senior 🌟 Architect",
      requiredSkills: ["TypeScript ✨"],
      minimumExperienceYears: 3
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.equal(result.matchingSkills.length, 1, "Should support Unicode matching safely.");
    assert.equal(result.matchingSkills[0].toLowerCase(), "typescript ✨");
  });

  // Scenario 7: Large Resume Text
  await suite.run("Large Resume (Simulating highly dense textual content)", async () => {
    const massiveText = "Experienced engineer. ".repeat(1000); // 20,000 characters
    
    const candidate: CandidateProfile = {
      name: "Dijkstra",
      skills: ["Go", "Distributed Systems"],
      experienceYears: 20,
      resumeText: massiveText
    };

    const job: JobDescription = {
      title: "Cloud Infrastructure Architect",
      requiredSkills: ["Go"],
      minimumExperienceYears: 10
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);
    assert.equal(result.matchingSkills.length, 1, "Large string handled without stack overflows.");
  });

  // Scenario 8: Concurrent Requests (Thread safety & statelessness)
  await suite.run("Concurrent Requests (100 parallel evaluations)", async () => {
    const concurrencyCount = 100;
    const promises: Array<Promise<any>> = [];

    const startTime = Date.now();
    for (let i = 0; i < concurrencyCount; i++) {
      const candidate: CandidateProfile = {
        name: `Candidate-${i}`,
        skills: ["Go"],
        experienceYears: i % 5
      };
      const job: JobDescription = {
        title: `Job-${i}`,
        requiredSkills: ["Go"],
        minimumExperienceYears: 3
      };
      promises.push(recruitmentModule.assessCandidate(candidate, job, { correlationId: `corr-${i}` }));
    }

    const results = await Promise.all(promises);
    const durationMs = Date.now() - startTime;

    assert.equal(results.length, concurrencyCount, "Should return exactly 100 evaluation outputs.");
    
    // Calculate performance stats
    const avgResponseTime = durationMs / concurrencyCount;
    const throughput = (concurrencyCount / (durationMs / 1000)).toFixed(2);

    console.log(`    [STATS] Processed ${concurrencyCount} assessments in ${durationMs}ms`);
    console.log(`    [STATS] Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`    [STATS] Assessment Throughput: ${throughput} assessments/sec`);

    assert.ok(avgResponseTime < 20, "Should remain highly performant.");
  });

  // Scenario 9: Coordinator Hard Failure
  await suite.run("Coordinator Failure (Graceful fallback to local match mechanics)", async () => {
    coordinator.forceFailure = true;

    const candidate: CandidateProfile = {
      name: "Haskell",
      skills: ["Haskell"],
      experienceYears: 10
    };

    const job: JobDescription = {
      title: "Functional Programmer",
      requiredSkills: ["Haskell"],
      minimumExperienceYears: 5
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.equal(result.candidateScore, 100, "Should fall back and calculate score locally.");
    assert.equal(result.riskSummary, "Coordinator offline. Local matching performed.");
    assert.equal(result.recommendation, "Conduct manual engineering screening.");
    assert.equal(result.decisionHistoryReference.length, 0);
  });

  // Scenario 10: Coordinator Partial Success
  await suite.run("Coordinator Partial Success (Missing sub-block recovery)", async () => {
    coordinator.forceFailure = false;
    coordinator.forcePartialSuccess = true;

    const candidate: CandidateProfile = {
      name: "Turing",
      skills: ["Prolog"],
      experienceYears: 12
    };

    const job: JobDescription = {
      title: "AI Specialist",
      requiredSkills: ["Prolog"],
      minimumExperienceYears: 5
    };

    const result = await recruitmentModule.assessCandidate(candidate, job);

    assert.equal(result.matchingSkills.length, 1);
    assert.equal(result.riskSummary, "No major compliance or security risks flagged.", "Falls back cleanly when risk result block is null.");
    assert.equal(result.explanation, "Matching explanation compiled successfully.", "Falls back cleanly when explanation result block is null.");
  });

  suite.report();
}

// Execute tests
runRecruitmentModuleTests().catch((err) => {
  console.error("Test execution crashed:", err);
  process.exit(1);
});
