/**
 * @file /src/kernel/tests/KernelIntegration.test.ts
 * @description Comprehensive End-to-End Integration Test for the Aziz Kernel.
 * Integrates State Store, Event Bus, Tool Registry, and Agent Runtime, verifying task creation,
 * sequential state-machine legal transitions, tool execution via schema validation, real-time logging,
 * telemetry recording, and final successful task completion.
 */

import { InMemoryStateStore } from "../StateStore";
import { InMemoryEventBus } from "../EventBus";
import { InMemoryToolRegistry } from "../ToolRegistry";
import { AgentRuntime, AgentManifest } from "../AgentRuntime";
import { ToolManifest, KernelEvent } from "../types";

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
    console.log(`===========================================`);
    console.log(`Kernel Integration E2E Tests Complete.`);
    console.log(`Total Trials: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`===========================================`);
    if (this.failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
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

async function runIntegrationTests() {
  await suite.run("Full End-to-End Kernel Integration Lifecycle", async () => {
    // 1. Instantiate the whole Kernel Stack
    const stateStore = new InMemoryStateStore();
    const eventBus = new InMemoryEventBus();
    const toolRegistry = new InMemoryToolRegistry({
      eventBus,
      stateStore,
      grantedPermissions: ["math_allowed"]
    });
    const agentRuntime = new AgentRuntime(stateStore, eventBus);

    // Track all events fired in the bus
    const eventsJournal: KernelEvent[] = [];
    eventBus.subscribe("*", (e) => {
      eventsJournal.push(e);
    });

    // 2. Register a Tool
    const mathToolManifest: ToolManifest = {
      id: "calculator",
      name: "Calculator Tool",
      description: "Applies arithmetic operations",
      permissions: ["math_allowed"],
      riskLevel: "low",
      timeoutMs: 100,
      maxRetries: 1,
      inputSchema: {
        type: "object",
        required: ["a", "b", "op"],
        properties: {
          a: { type: "number" },
          b: { type: "number" },
          op: { type: "string", enum: ["add", "subtract", "multiply"] }
        }
      },
      outputSchema: {
        type: "object",
        required: ["result"],
        properties: {
          result: { type: "number" }
        }
      }
    };

    toolRegistry.registerTool(mathToolManifest, async (args) => {
      const { a, b, op } = args;
      if (op === "add") return { result: a + b };
      if (op === "subtract") return { result: a - b };
      if (op === "multiply") return { result: a * b };
      throw new Error(`Unsupported operator: ${op}`);
    });

    // 3. Register an Agent
    const mathAgentManifest: AgentManifest = {
      id: "math_agent",
      name: "Math Specialist Agent",
      description: "Executes mathematical tasks using tools",
      capabilityTags: ["math", "calculator"],
      maxExecutionTimeMs: 250
    };

    agentRuntime.registerAgent(mathAgentManifest, async (ctx) => {
      ctx.log("Starting calculation workflow");

      // Set up dynamic task step
      ctx.stateStore.updateStep(ctx.taskId, "calc_step_1", {
        name: "Perform Addition Tool Call",
        status: "running"
      });

      // Call tool through the Tool Registry
      const toolOutput = await toolRegistry.executeTool("calculator", { a: 15, b: 27, op: "add" }, ctx.taskId);
      assert.equal(toolOutput.result, 42, "Calculator tool output should be correct");

      ctx.recordStepCompleted("calc_step_1", 12, ["Successfully computed 15 + 27 = 42"]);
      ctx.recordTelemetry(250, 0.005);

      return { finalResult: toolOutput.result };
    });

    // 4. Create Task (Lifecycle Entrypoint)
    const goal = "Perform math validation of 15 + 27";
    const taskId = stateStore.createTask(goal);
    assert.ok(taskId, "Task ID should be initialized");
    assert.equal(stateStore.getTaskState(taskId)?.status, "pending", "Initial status should be pending");

    // Initialize step inside state store beforehand
    stateStore.updateStep(taskId, "calc_step_1", { name: "Perform Addition Tool Call" });

    // 5. Execute Task through Agent Runtime
    const success = await agentRuntime.executeTask(taskId, "math_agent");
    assert.equal(success, true, "Task execution must succeed");

    // 6. Verify Contract Compatibility & Final State
    const finalState = stateStore.getTaskState(taskId);
    assert.ok(finalState, "Final state should exist");
    assert.equal(finalState?.status, "completed", "Task status must end at completed");
    assert.equal(finalState?.steps.length, 1, "There should be exactly one tracking step");
    assert.equal(finalState?.steps[0].status, "completed", "Step must be logged as completed");
    assert.equal(finalState?.steps[0].logs?.[0], "Successfully computed 15 + 27 = 42");

    // Verify Telemetry is recorded both for the tool call AND custom telemetry hooks
    // InMemoryToolRegistry logs tool execution duration/metrics, Agent logs custom LLM telemetry
    assert.equal(finalState?.telemetry.tokensUsed, 250, "LLM tokens must match");
    assert.equal(finalState?.telemetry.costInUSD, 0.005, "LLM financial cost must match");
    assert.equal(finalState?.telemetry.toolInvocations["calculator"], 1, "Tool registry must record calculator execution counts");

    // Verify Event Bus published matching traces:
    // - AgentRegistered (fired when agent is registered)
    // - AgentExecutionStarted (fired when AgentRuntime starts run)
    // - ToolExecuted (fired by ToolRegistry)
    // - AgentExecutionProgress (fired by agent ctx.log)
    // - AgentExecutionCompleted (fired when handler finishes)
    // - TaskCompleted (fired by AgentRuntime at task terminal end)
    const eventTypes = eventsJournal.map(e => e.type);
    assert.ok(eventTypes.includes("AgentRegistered"), "Must dispatch AgentRegistered event");
    assert.ok(eventTypes.includes("AgentExecutionStarted"), "Must dispatch AgentExecutionStarted event");
    assert.ok(eventTypes.includes("ToolExecuted"), "Must dispatch ToolExecuted event from registry");
    assert.ok(eventTypes.includes("AgentExecutionProgress"), "Must dispatch AgentExecutionProgress event");
    assert.ok(eventTypes.includes("AgentExecutionCompleted"), "Must dispatch AgentExecutionCompleted event");
    assert.ok(eventTypes.includes("TaskCompleted"), "Must dispatch TaskCompleted event");
  });

  suite.report();
}

runIntegrationTests().catch(err => {
  console.error("Fatal Integration test crash:", err);
  process.exit(1);
});
