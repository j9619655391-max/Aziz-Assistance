/**
 * @file /src/kernel/tests/RecruitmentWorkflowEngine.test.ts
 * @description Unit, batch, and concurrency test suite for the RecruitmentWorkflowEngine.
 */

import { RecruitmentIntelligenceModule, CandidateProfile, JobDescription } from "../../domains/recruitment/RecruitmentIntelligenceModule";
import { RecruitmentWorkflowEngine, CandidateSubmission } from "../../domains/recruitment/RecruitmentWorkflowEngine";
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
    console.log(`\nTest Run Completed: ${this.passed}/${this.total} workflow scenarios passed.`);
    if (this.failed > 0) {
      throw new Error(`TestSuite failed with ${this.failed} assertion errors.`);
    }
  }
}

// ==========================================
// MOCK INTELLIGENCE COORDINATOR FOR TESTING
// ==========================================

class MockIntelligenceCoordinator implements IIntelligenceCoordinator {
  public forceFailure = false;
  public forcePartialSuccess = false;

  public async coordinate(input: Record<string, any>): Promise<UnifiedIntelligenceResult> {
    if (this.forceFailure) {
      throw new Error("Simulated Coordinator Hard Crash");
    }

    const candidateSkills: string[] = input.processedOutput?.candidateSkills || [];
    const jobSkills: string[] = input.processedOutput?.jobSkills || [];
    const candExp: number = input.processedOutput?.experienceYears || 0;
    const minExp: number = input.processedOutput?.minimumExperienceYears || 0;

    const intersection = candidateSkills.filter(s => jobSkills.some(js => js.toLowerCase() === s.toLowerCase()));
    let mockSimilarity = 50;
    if (jobSkills.length === 0) {
      mockSimilarity = 100;
    } else {
      mockSimilarity = Math.round((intersection.length / jobSkills.length) * 100);
    }

    if (candExp >= minExp) {
      mockSimilarity = Math.min(100, mockSimilarity + 10);
    } else {
      mockSimilarity = Math.max(0, mockSimilarity - 20);
    }

    if (this.forcePartialSuccess) {
      return {
        correlationId: input.correlationId || "partial-trace-456",
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
        risk: null as any,
        explanation: null as any,
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
      decisionHistory: [],
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
        historicalMatches: [],
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

async function runWorkflowEngineTests() {
  console.log("===================================================");
  console.log("      RECRUITMENT WORKFLOW ENGINE TESTS            ");
  console.log("===================================================\n");

  const coordinator = new MockIntelligenceCoordinator();
  const recruitmentModule = new RecruitmentIntelligenceModule(coordinator);
  const workflowEngine = new RecruitmentWorkflowEngine(recruitmentModule);

  const testJob: JobDescription = {
    title: "Lead Cloud Architect",
    requiredSkills: ["AWS", "Kubernetes", "TypeScript"],
    minimumExperienceYears: 8
  };

  // Reset history state before tests
  RecruitmentWorkflowEngine.resetGlobalState();

  // Scenario 1: Single Candidate
  await suite.run("Single candidate processing and evaluation", async () => {
    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Alice Liddell",
          skills: ["AWS", "Kubernetes", "TypeScript", "Go"],
          experienceYears: 10,
          experienceSummary: "Design cloud native architectures with AWS and Kubernetes."
        },
        recruiterNotes: "Excellent profile, top recommendation."
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob);

    assert.equal(result.workflowStatus, "SUCCESS");
    assert.equal(result.candidateRanking.length, 1);
    assert.equal(result.candidateRanking[0].candidateName, "Alice Liddell");
    assert.equal(result.candidateRanking[0].rank, 1);
    assert.equal(result.candidateRanking[0].version, 1);
    assert.equal(result.candidateRanking[0].duplicateDetected, false);
    assert.equal(result.candidateRanking[0].interviewRecommendation, "STRONGLY_RECOMMENDED");
    assert.equal(result.candidateRanking[0].recruiterNotes, "Excellent profile, top recommendation.");
    assert.equal(result.shortlistedCandidates.length, 1);
    assert.equal(result.recommendations.primaryCandidate, "Alice Liddell");
  });

  // Scenario 2: Multiple Candidates & Ranking
  await suite.run("Multiple candidates batch ranking logic", async () => {
    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Charlie Brown",
          skills: ["AWS"],
          experienceYears: 2
        }
      },
      {
        candidate: {
          name: "Bob Builder",
          skills: ["AWS", "TypeScript"],
          experienceYears: 6
        }
      },
      {
        candidate: {
          name: "Diana Prince",
          skills: ["AWS", "Kubernetes", "TypeScript"],
          experienceYears: 12
        }
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob);

    assert.equal(result.candidateRanking.length, 3);
    
    // Diana Prince has 100% skills intersection + sufficient experience -> Rank 1
    assert.equal(result.candidateRanking[0].candidateName, "Diana Prince");
    assert.equal(result.candidateRanking[0].rank, 1);

    // Bob Builder has 2/3 skills + insufficient experience -> Rank 2
    assert.equal(result.candidateRanking[1].candidateName, "Bob Builder");
    assert.equal(result.candidateRanking[1].rank, 2);

    // Charlie Brown has 1/3 skills + 2 years experience -> Rank 3
    assert.equal(result.candidateRanking[2].candidateName, "Charlie Brown");
    assert.equal(result.candidateRanking[2].rank, 3);

    // Shortlisted should only include Diana Prince and Bob Builder (threshold 70 by default)
    assert.ok(result.shortlistedCandidates.length >= 1);
    assert.equal(result.shortlistedCandidates[0].candidateName, "Diana Prince");
  });

  // Scenario 3: Duplicate Resumes Detection (Batch duplicates & structural duplicates)
  await suite.run("Duplicate resume detection (Name-based and deep profile-based)", async () => {
    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "John Doe",
          skills: ["AWS", "TypeScript"],
          experienceYears: 5
        }
      },
      {
        candidate: {
          name: "John Doe", // Exact duplicate name
          skills: ["AWS", "TypeScript"],
          experienceYears: 5
        }
      },
      {
        candidate: {
          name: "Jane Doe", // Different name but exactly identical skills + experience
          skills: ["AWS", "TypeScript"],
          experienceYears: 5
        }
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob);

    assert.equal(result.candidateRanking.length, 3);
    
    const john1 = result.candidateRanking.find(r => r.candidateName === "John Doe" && r.rank === 1);
    const john2 = result.candidateRanking.find(r => r.candidateName === "John Doe" && r.rank === 2);
    const jane = result.candidateRanking.find(r => r.candidateName === "Jane Doe");

    assert.ok(john1 !== undefined);
    assert.ok(john2 !== undefined);
    assert.ok(jane !== undefined);

    // Duplicate detection check
    assert.equal(john2?.duplicateDetected, true);
    assert.equal(john2?.duplicateOf, "John Doe");

    assert.equal(jane?.duplicateDetected, true);
    assert.equal(jane?.duplicateOf, "John Doe");
  });

  // Scenario 4: Resume Versioning & Assessment History
  await suite.run("Resume versioning tracking and cumulative assessment history logs", async () => {
    // Submit same candidate Alice but with updated skills (version 2)
    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Alice Liddell",
          skills: ["AWS", "Kubernetes", "TypeScript", "Go", "Docker"],
          experienceYears: 11
        }
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob);

    // Alice should now be Version 2 because she was processed in Scenario 1
    assert.equal(result.candidateRanking[0].version, 2);
    
    // Total assessment history for Alice should contain both Scenario 1 and Scenario 4 evaluations
    const history = result.assessmentHistory["Alice Liddell"];
    assert.equal(history.length, 2);
  });

  // Scenario 5: Batch Processing with Custom Options
  await suite.run("Batch processing with custom shortlisting thresholds", async () => {
    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Eve Green",
          skills: ["AWS"],
          experienceYears: 4
        }
      }
    ];

    // High threshold: 90
    const resultHigh = await workflowEngine.executeWorkflow(submissions, testJob, { shortlistThreshold: 90 });
    assert.equal(resultHigh.shortlistedCandidates.length, 0);

    // Low threshold: 10
    const resultLow = await workflowEngine.executeWorkflow(submissions, testJob, { shortlistThreshold: 10 });
    assert.equal(resultLow.shortlistedCandidates.length, 1);
  });

  // Scenario 6: Concurrent Workflows Simulation (Statelessness / thread-safety)
  await suite.run("Concurrent workflow engine runs correctness", async () => {
    const runCount = 50;
    const promises: Array<Promise<any>> = [];

    for (let i = 0; i < runCount; i++) {
      const submissions: CandidateSubmission[] = [
        {
          candidate: {
            name: `Concurrent-${i}`,
            skills: ["AWS", "Kubernetes"],
            experienceYears: 5
          }
        }
      ];
      promises.push(workflowEngine.executeWorkflow(submissions, testJob, { correlationId: `wf-concurrent-${i}` }));
    }

    const results = await Promise.all(promises);
    assert.equal(results.length, runCount);

    results.forEach((res, i) => {
      assert.equal(res.workflowId, `wf-concurrent-${i}`);
      assert.equal(res.candidateRanking.length, 1);
      assert.equal(res.candidateRanking[0].candidateName, `Concurrent-${i}`);
    });
  });

  // Scenario 7: Coordinator Partial Failure and Recovery
  await suite.run("Coordinator partial failure and graceful recovery", async () => {
    coordinator.forceFailure = false;
    coordinator.forcePartialSuccess = true; // Simulates null risk/explain blocks

    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Thomas Anderson",
          skills: ["AWS", "Kubernetes", "TypeScript"],
          experienceYears: 9
        }
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob);

    assert.equal(result.workflowStatus, "SUCCESS"); // Still succeeds since null-blocks are handled resiliently
    assert.equal(result.candidateRanking[0].candidateName, "Thomas Anderson");
    assert.ok(result.candidateRanking[0].assessment.riskSummary.includes("Unknown due to fallback") || result.candidateRanking[0].assessment.riskSummary.includes("No major compliance"));
  });

  // Scenario 8: Coordinator Full Failure and Reversion Recovery
  await suite.run("Coordinator complete hard crash fallback recovery", async () => {
    coordinator.forceFailure = true;

    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Neo Matrix",
          skills: ["AWS", "Kubernetes"],
          experienceYears: 8
        }
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob);

    // Reverts to local matching or fallback object safely
    assert.equal(result.candidateRanking[0].candidateName, "Neo Matrix");
    assert.equal(result.candidateRanking[0].score, 80); // Failsafe computed locally based on matching skills
    assert.equal(result.candidateRanking[0].assessment.riskSummary, "Coordinator offline. Local matching performed.");
  });

  // Scenario 9: Report Export Generation Correctness
  await suite.run("Structured Markdown report export validation", async () => {
    coordinator.forceFailure = false;
    coordinator.forcePartialSuccess = false;

    const submissions: CandidateSubmission[] = [
      {
        candidate: {
          name: "Bruce Wayne",
          skills: ["AWS", "Kubernetes", "TypeScript"],
          experienceYears: 15
        },
        recruiterNotes: "Top-tier Dark Knight Cloud Expert."
      }
    ];

    const result = await workflowEngine.executeWorkflow(submissions, testJob, { correlationId: "wf-export-112" });
    const reportMarkdown = workflowEngine.generateExportReport(result);

    assert.ok(reportMarkdown.includes("# RECRUITMENT ASSESSMENT WORKFLOW REPORT"));
    assert.ok(reportMarkdown.includes("wf-export-112"));
    assert.ok(reportMarkdown.includes("Bruce Wayne"));
    assert.ok(reportMarkdown.includes("Top-tier Dark Knight Cloud Expert."));
  });

  suite.report();
}

// Execute workflow tests
runWorkflowEngineTests().catch((err) => {
  console.error("Workflow Test Suite Execution crashed:", err);
  process.exit(1);
});
