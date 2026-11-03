/**
 * @file /src/kernel/tests/RunRegression.ts
 * @description Master Regression Suite Runner for the Aziz Kernel.
 * Programmatically runs State Store, Event Bus, Tool Registry, Agent Runtime, and Integration tests
 * in clean subprocesses, capturing output and aggregating results. Exits with code 0 if all suites
 * pass, and code 1 if any suite fails.
 */

import { exec } from "child_process";
import * as path from "path";

interface SuiteResult {
  name: string;
  file: string;
  success: boolean;
  durationMs: number;
  output: string;
}

const TEST_SUITES = [
  { name: "State Store Unit Tests", file: "src/kernel/tests/StateStore.test.ts" },
  { name: "Event Bus Unit Tests", file: "src/kernel/tests/EventBus.test.ts" },
  { name: "Tool Registry Unit Tests", file: "src/kernel/tests/ToolRegistry.test.ts" },
  { name: "Agent Runtime Unit Tests", file: "src/kernel/tests/AgentRuntime.test.ts" },
  { name: "Planner Unit Tests", file: "src/kernel/tests/Planner.test.ts" },
  { name: "Context Builder Unit Tests", file: "src/kernel/tests/ContextBuilder.test.ts" },
  { name: "Model Router Unit Tests", file: "src/kernel/tests/ModelRouter.test.ts" },
  { name: "Verification Engine Unit Tests", file: "src/kernel/tests/VerificationEngine.test.ts" },
  { name: "Reflection Engine Unit Tests", file: "src/kernel/tests/ReflectionEngine.test.ts" },
  { name: "Explainability Service Unit Tests", file: "src/kernel/tests/ExplainabilityService.test.ts" },
  { name: "Confidence Service Unit Tests", file: "src/kernel/tests/ConfidenceService.test.ts" },
  { name: "Semantic Intelligence Unit Tests", file: "src/kernel/tests/SemanticIntelligenceService.test.ts" },
  { name: "Risk Intelligence Unit Tests", file: "src/kernel/tests/RiskIntelligenceService.test.ts" },
  { name: "Decision Log Service Unit Tests", file: "src/kernel/tests/DecisionLogService.test.ts" },
  { name: "Recommendation Service Unit Tests", file: "src/kernel/tests/RecommendationService.test.ts" },
  { name: "Intelligence Coordinator Unit Tests", file: "src/kernel/tests/IntelligenceCoordinator.test.ts" },
  { name: "Recruitment Intelligence Platform Unit Tests", file: "src/kernel/tests/RecruitmentIntelligenceModule.test.ts" },
  { name: "Recruitment Workflow Engine Unit Tests", file: "src/kernel/tests/RecruitmentWorkflowEngine.test.ts" },
  { name: "Business Process Engine Unit Tests", file: "src/kernel/tests/BusinessProcessEngine.test.ts" },
  { name: "Identity Platform Unit Tests", file: "src/kernel/tests/IdentityPlatform.test.ts" },
  { name: "Enterprise Observability Unit & Load Tests", file: "src/kernel/tests/ObservabilityPlatform.test.ts" },
  { name: "Career Supervisor Orchestration Unit Tests", file: "src/kernel/tests/CareerSupervisorService.test.ts" },
  { name: "Discovery Provider Framework Unit Tests", file: "src/kernel/tests/DiscoveryProviderFramework.test.ts" },
  { name: "Unified API Gateway Integration Tests", file: "src/kernel/tests/ApiGateway.test.ts" },
  { name: "Kernel Integration E2E Tests", file: "src/kernel/tests/KernelIntegration.test.ts" }
];

function runSuite(name: string, file: string): Promise<SuiteResult> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    console.log(`[REGRESSION] Launching ${name} (${file})...`);
    
    // Execute using local tsx binary directly for high-speed synchronous execution
    exec(`./node_modules/.bin/tsx ${file}`, { maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      const success = !error;
      const output = stdout + stderr;
      
      if (success) {
        console.log(`[REGRESSION]  ✅ ${name} passed in ${durationMs}ms`);
      } else {
        console.error(`[REGRESSION]  ❌ ${name} failed in ${durationMs}ms`);
      }
      
      resolve({
        name,
        file,
        success,
        durationMs,
        output
      });
    });
  });
}

async function runRegressionSuite() {
  console.log("=================================================================");
  console.log("               AZIZ KERNEL MASTER REGRESSION SUITE               ");
  console.log("=================================================================\n");

  const results: SuiteResult[] = [];
  const startOverall = Date.now();

  for (const suite of TEST_SUITES) {
    const res = await runSuite(suite.name, suite.file);
    results.push(res);
  }

  const durationOverall = Date.now() - startOverall;
  const totalCount = results.length;
  const passCount = results.filter((r) => r.success).length;
  const failCount = totalCount - passCount;

  console.log("\n=================================================================");
  console.log("                       REGRESSION REPORT                         ");
  console.log("=================================================================");
  
  results.forEach((r) => {
    const statusSymbol = r.success ? "✅ PASS" : "❌ FAIL";
    console.log(`- [${statusSymbol}] ${r.name.padEnd(30)} (${r.durationMs} ms)`);
  });

  console.log(`-----------------------------------------------------------------`);
  console.log(`Overall Duration : ${durationOverall} ms`);
  console.log(`Total Suites     : ${totalCount}`);
  console.log(`Passed Suites    : ${passCount}`);
  console.log(`Failed Suites    : ${failCount}`);
  console.log(`Success Rate     : ${((passCount / totalCount) * 100).toFixed(1)}%`);
  console.log("=================================================================\n");

  if (failCount > 0) {
    console.error("❌ REGRESSION SUITE FAILED. See outputs above.");
    process.exit(1);
  } else {
    console.log("✅ ALL REGRESSION SUITES PASSED. Ready for next sprint!");
    process.exit(0);
  }
}

runRegressionSuite().catch((err) => {
  console.error("Fatal exception in Regression Suite runner:", err);
  process.exit(1);
});
