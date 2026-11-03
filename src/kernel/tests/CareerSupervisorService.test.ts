/**
 * @file /src/kernel/tests/CareerSupervisorService.test.ts
 * @description Unit tests for CareerSupervisorService (Epic 0 Orchestration Layer).
 */

import { CareerSupervisorService } from "../../domains/supervisor/CareerSupervisorService";
import { InMemoryRepository } from "../../domains/shared/repository/InMemoryRepository";
import { AIService } from "../../domains/infrastructure/AIService";
import { MatchingService } from "../../domains/employment/MatchingService";
import { JobSearchService } from "../../domains/employment/JobSearchService";
import { FreelanceService } from "../../domains/freelance/FreelanceService";
import { RecruiterService } from "../../domains/recruitment/RecruiterService";
import { AlertService } from "../../domains/automation/AlertService";
import { ResumeService } from "../../domains/employment/ResumeService";
import { ATSService } from "../../domains/employment/ATSService";
import { NotificationService } from "../../domains/communication/NotificationService";
import { ProviderManager } from "../provider/ProviderManager";

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
    console.log(`Career Supervisor Unit Tests Complete.`);
    console.log(`Total Run: ${this.totalTests}`);
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

async function runTests() {
  const runner = new TestRunner();

  const repo = new InMemoryRepository();
  const aiService = new AIService(repo);
  // Mock AI generation for deterministic unit testing
  aiService.generateContentWithFallback = async () => ({
    text: JSON.stringify({
      score: 92,
      atsScore: 92,
      matchedSkills: ["TypeScript", "React"],
      missingSkills: ["Go"],
      critique: "Strong technical alignment",
      recommendations: ["Highlight cloud projects"],
      coverLetter: "Dear Hiring Team,\n\nI am writing to express my strong interest..."
    })
  });

  const matchingService = new MatchingService();
  const providerManager = ProviderManager.getInstance();
  const jobSearchService = new JobSearchService(repo, matchingService, providerManager);
  const freelanceService = new FreelanceService(repo, matchingService, providerManager, aiService);
  const recruiterService = new RecruiterService(repo);
  const notificationService = new NotificationService(repo);
  const alertService = new AlertService(repo, matchingService, notificationService);
  const resumeService = new ResumeService(aiService);
  const atsService = new ATSService(repo, aiService);

  const supervisor = new CareerSupervisorService(
    repo,
    jobSearchService,
    freelanceService,
    recruiterService,
    alertService,
    resumeService,
    atsService,
    notificationService,
    undefined,
    matchingService
  );

  await runner.run("Run autonomous discovery cycle across jobs and freelance", async () => {
    const res = await supervisor.runAutonomousDiscoveryCycle();
    if (typeof res.jobsCount !== "number" || typeof res.freelanceCount !== "number") {
      throw new Error("Invalid discovery result structure.");
    }
  });

  await runner.run("Evaluate and score opportunities", async () => {
    const res = await supervisor.evaluateAndScoreOpportunities();
    if (typeof res.scoredCount !== "number" || typeof res.averageScore !== "number") {
      throw new Error("Invalid scoring result structure.");
    }
  });

  await runner.run("Dispatch recruiter workflows", async () => {
    const res = await supervisor.dispatchRecruiterWorkflows();
    if (typeof res.recruiterCount !== "number") {
      throw new Error("Invalid recruiter dispatch result structure.");
    }
  });

  await runner.run("Dispatch freelance workflows", async () => {
    const res = await supervisor.dispatchFreelanceWorkflows();
    if (typeof res.totalProjects !== "number") {
      throw new Error("Invalid freelance dispatch result structure.");
    }
  });

  await runner.run("Trigger application generation for existing job", async () => {
    const jobs = await repo.findAll("jobs");
    const targetJobId = jobs.length > 0 ? jobs[0].id : "job-demo-1";
    const res = await supervisor.triggerApplicationGeneration(targetJobId);
    if (!res.atsAnalysis || typeof res.atsAnalysis.score !== "number") {
      throw new Error("Invalid application generation response.");
    }
  });

  await runner.run("Run full supervisor cycle and record memory snapshot", async () => {
    const result = await supervisor.runFullSupervisorCycle();
    if (!result.cycleId || result.status !== "SUCCESS") {
      throw new Error("Supervisor full cycle failed.");
    }
    const memories = await repo.getMemories();
    const supervisorMem = memories.find((m) => m.content.includes("Career Supervisor Cycle"));
    if (!supervisorMem) {
      throw new Error("Supervisor memory was not recorded in repository.");
    }
  });

  await runner.run("Generate executive summary", async () => {
    const summary = await supervisor.generateExecutiveSummary();
    if (!summary.summaryId || !Array.isArray(summary.executiveInsights) || summary.systemHealthStatus !== "HEALTHY") {
      throw new Error("Invalid executive summary response.");
    }
  });

  await runner.run("Autonomous scheduler start and stop", async () => {
    supervisor.startAutonomousScheduler(100000);
    supervisor.stopAutonomousScheduler();
  });

  alertService.shutdown();
  runner.finish();
}

runTests();
