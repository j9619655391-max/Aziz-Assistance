/**
 * @file /src/kernel/tests/KernelDemo.ts
 * @description Command-line interface demonstration for the Aziz Kernel.
 * Proves that the complete, zero-dependency integrated Kernel (State Store, Event Bus, Tool Registry,
 * and Agent Runtime) works correctly and seamlessly.
 */

import { InMemoryStateStore } from "../StateStore";
import { InMemoryEventBus } from "../EventBus";
import { InMemoryToolRegistry } from "../ToolRegistry";
import { AgentRuntime, AgentManifest } from "../AgentRuntime";
import { ToolManifest } from "../types";

async function runKernelDemo() {
  console.log("===============================================================");
  console.log("             AZIZ KERNEL INTEGRATION SPRINT DEMO               ");
  console.log("===============================================================");
  console.log(" This demo executes one complete task through the entire stack.");
  console.log(" [NO PLANNER] [NO AUTONOMOUS LOOPS] [INTEGRATION ONLY]");
  console.log("===============================================================\n");

  // 1. Core Stack Initialization
  console.log("[INIT] Instantiating Kernel core components...");
  const stateStore = new InMemoryStateStore();
  const eventBus = new InMemoryEventBus();
  const toolRegistry = new InMemoryToolRegistry({
    eventBus,
    stateStore,
    grantedPermissions: ["sys_audit"]
  });
  const agentRuntime = new AgentRuntime(stateStore, eventBus);
  console.log("  -> State Store initialized");
  console.log("  -> Event Bus initialized");
  console.log("  -> Tool Registry initialized");
  console.log("  -> Agent Runtime initialized\n");

  // 2. Setting up Event Bus Real-Time Logging
  console.log("[EVENT-BUS] Subscribing real-time observer to Event Bus...");
  eventBus.subscribe("*", (e) => {
    const timestamp = new Date(e.timestamp).toLocaleTimeString();
    console.log(`  [${timestamp}] 🔔 EVENT: ${e.type.padEnd(25)} | Task ID: ${e.taskId}`);
    if (e.type === "AgentExecutionProgress") {
      console.log(`               LOG: "${e.payload.message}"`);
    } else if (e.type === "ToolExecuted") {
      console.log(`               TOOL: "${e.payload.toolId}" | Success: ${e.payload.success} | Duration: ${e.payload.durationMs}ms`);
    }
  });
  console.log("  -> Event Bus observer hooked up successfully\n");

  // 3. Register a Diagnostic Audit Tool in Tool Registry
  console.log("[TOOL-REGISTRY] Registering system audit capability...");
  const auditToolManifest: ToolManifest = {
    id: "system_lint_audit",
    name: "System Lint Audit",
    description: "Inspects static source code files and directory configurations",
    permissions: ["sys_audit"],
    riskLevel: "medium",
    timeoutMs: 150,
    maxRetries: 1,
    inputSchema: {
      type: "object",
      required: ["directory", "fixIssues"],
      properties: {
        directory: { type: "string" },
        fixIssues: { type: "boolean" }
      }
    },
    outputSchema: {
      type: "object",
      required: ["issuesFound", "status"],
      properties: {
        issuesFound: { type: "integer" },
        status: { type: "string" }
      }
    }
  };

  toolRegistry.registerTool(auditToolManifest, async (args) => {
    console.log(`               [RUNNING TOOL] Inspecting directory: "${args.directory}" (Fix issues: ${args.fixIssues})`);
    // Simulated diagnostic inspection
    return {
      issuesFound: 0,
      status: "COMPLIANT_PASS"
    };
  });
  console.log("  -> Tool 'system_lint_audit' registered with strict schemas\n");

  // 4. Register SRE Specialist Agent
  console.log("[AGENT-RUNTIME] Registering specialist Agent...");
  const sreAgentManifest: AgentManifest = {
    id: "sre_specialist",
    name: "SRE Specialist Agent",
    description: "Audits configurations and checks workspace compliance guidelines",
    capabilityTags: ["sre", "audit", "linter"],
    maxExecutionTimeMs: 500
  };

  agentRuntime.registerAgent(sreAgentManifest, async (ctx) => {
    ctx.log("Starting SRE S-4 workspace compliance audit");

    // Dynamic Step 1
    ctx.stateStore.updateStep(ctx.taskId, "step_lint_audit", {
      name: "Run lint compliance check on current directory",
      status: "running"
    });

    ctx.log("Invoking static verification tool");
    const result = await toolRegistry.executeTool("system_lint_audit", {
      directory: "/src/kernel",
      fixIssues: false
    }, ctx.taskId);

    ctx.recordStepCompleted("step_lint_audit", 15, [`Code rules are passing. Verification status: ${result.status}`]);
    ctx.recordTelemetry(180, 0.0036);
    
    ctx.log("All validation checks passed successfully");
    return { compliant: true };
  });
  console.log("  -> SRE Specialist Agent registered in AgentRuntime\n");

  // 5. Create Task (Initial Entry point)
  console.log("[STATE-STORE] Creating new SRE Task...");
  const goal = "Verify that our workspace directory follows strict lint rules";
  const taskId = stateStore.createTask(goal);
  
  // Seed the required steps
  stateStore.updateStep(taskId, "step_lint_audit", {
    name: "Run lint compliance check on current directory"
  });
  
  console.log(`  -> Task created successfully. Task ID: ${taskId}`);
  console.log(`  -> Initial state: ${stateStore.getTaskState(taskId)?.status}\n`);

  // 6. Execute Task through Agent Runtime (The Orchestrated Loop)
  console.log("[ORCHESTRATION] Initiating complete task execution lifecycle...");
  const success = await agentRuntime.executeTask(taskId, "sre_specialist");
  console.log(`\n[ORCHESTRATION] Execution completed. Succeeded: ${success}\n`);

  // 7. Render Final Consolidated State Store State and Telemetry
  const finalState = stateStore.getTaskState(taskId)!;
  console.log("===============================================================");
  console.log("                       FINAL TASK STATE                        ");
  console.log("===============================================================");
  console.log(`Task ID      : ${finalState.taskId}`);
  console.log(`Goal         : "${finalState.goal}"`);
  console.log(`Status       : ${finalState.status}`);
  console.log(`Created At   : ${finalState.createdAt}`);
  console.log(`Updated At   : ${finalState.updatedAt}`);
  console.log("---------------------------- STEPS ----------------------------");
  finalState.steps.forEach((step, idx) => {
    console.log(`Step ${idx + 1}: [${step.status.toUpperCase()}] ${step.name}`);
    if (step.logs && step.logs.length > 0) {
      step.logs.forEach(log => console.log(`  └─ Log: "${log}"`));
    }
  });
  console.log("-------------------------- TELEMETRY --------------------------");
  console.log(`Tokens Used  : ${finalState.telemetry.tokensUsed}`);
  console.log(`USD Cost     : $${finalState.telemetry.costInUSD.toFixed(6)}`);
  console.log(`Duration     : ${finalState.telemetry.durationMs} ms`);
  console.log(`Invocations  : ${JSON.stringify(finalState.telemetry.toolInvocations)}`);
  console.log("===============================================================");
}

runKernelDemo().catch((err) => {
  console.error("Fatal exception in CLI demo:", err);
  process.exit(1);
});
