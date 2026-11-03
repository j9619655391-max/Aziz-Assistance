/**
 * @file /src/kernel/tests/AgentRuntime.test.ts
 * @description Comprehensive unit test suite for AgentRuntime.
 * Verifies registrations, basic executions, step progress hooks, failure paths, manual cancellations,
 * automated timeouts, and telemetry/event integrations.
 */

import { 
  AgentRuntime, 
  AgentManifest, 
  AgentRegistrationError, 
  AgentNotFoundError, 
  CancellationException, 
  TimeoutException 
} from "../AgentRuntime";
import { InMemoryStateStore } from "../StateStore";
import { InMemoryEventBus } from "../EventBus";

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
    console.log(`Agent Runtime Unit Tests Complete.`);
    console.log(`Total Trials: ${this.passed + this.failed}`);
    console.log(`Success Rate: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
    console.log(`Passed: ${this.passed}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`===========================================`);
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
  },
  throws: (fn: () => void, errorType: any, msg?: string) => {
    try {
      fn();
    } catch (err: any) {
      if (err instanceof errorType) {
        return;
      }
      throw new Error(`${msg || "Assertion failed"}: expected error of type ${errorType.name}, got ${err?.name || typeof err}`);
    }
    throw new Error(`${msg || "Assertion failed"}: expected error, but no error was thrown`);
  },
  throwsAsync: async (fn: () => Promise<void>, errorType: any, msg?: string) => {
    try {
      await fn();
    } catch (err: any) {
      if (err instanceof errorType || (errorType === Error && err instanceof Error) || err?.name === errorType.name) {
        return;
      }
      throw new Error(`${msg || "Assertion failed"}: expected async error of type ${errorType.name}, got ${err?.name || typeof err}`);
    }
    throw new Error(`${msg || "Assertion failed"}: expected async error, but no error was thrown`);
  }
};

const suite = new TestSuite();

const baseManifest: AgentManifest = {
  id: "coding_agent",
  name: "Coding Specialist",
  description: "Resolves workspace coding goals",
  capabilityTags: ["coding", "refactor"],
  maxExecutionTimeMs: 150
};

async function runTests() {
  // --- TEST CASES ---

  await suite.run("Agent Registration and Discovery", () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    runtime.registerAgent(baseManifest, async () => "ready");

    const list = runtime.listAgents();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, "coding_agent");

    const agent = runtime.getAgent("coding_agent");
    assert.ok(agent);
    assert.equal(agent?.name, "Coding Specialist");

    // Memory isolation check
    if (agent) {
      agent.name = "Mutated Specialist";
    }
    assert.equal(runtime.getAgent("coding_agent")?.name, "Coding Specialist", "Fetched manifest must be isolated from state mutations");
  });

  await suite.run("Agent Manifest Struct Validation", () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    // Empty ID registration failure
    assert.throws(() => {
      runtime.registerAgent({ ...baseManifest, id: "" }, async () => {});
    }, AgentRegistrationError);

    // Invalid max timeout registration failure
    assert.throws(() => {
      runtime.registerAgent({ ...baseManifest, maxExecutionTimeMs: -50 }, async () => {});
    }, AgentRegistrationError);

    // Duplicate registrations failure
    runtime.registerAgent(baseManifest, async () => {});
    assert.throws(() => {
      runtime.registerAgent(baseManifest, async () => {});
    }, AgentRegistrationError);
  });

  await suite.run("Successful Agent Task Execution (Fallback Default)", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    // Register primary agent
    runtime.registerAgent(baseManifest, async (ctx) => {
      ctx.log("Starting code analysis");
      ctx.recordTelemetry(150, 0.003);
      return "Refactoring Complete";
    });

    const taskId = store.createTask("Refactor ToolRegistry file");
    
    // Subscribe to Event Bus to catch notifications
    const events: any[] = [];
    bus.subscribe("*", (e) => events.push(e));

    const success = await runtime.executeTask(taskId);
    assert.equal(success, true, "Execution should succeed");

    // Verify task state transitions
    const state = store.getTaskState(taskId);
    assert.ok(state);
    assert.equal(state?.status, "completed", "Task state should mark completed");
    assert.equal(state?.telemetry.tokensUsed, 150);
    assert.equal(state?.telemetry.costInUSD, 0.003);

    // Verify Event Bus published expected frames
    const types = events.map(e => e.type);
    assert.ok(types.includes("AgentExecutionStarted"));
    assert.ok(types.includes("AgentExecutionProgress"));
    assert.ok(types.includes("AgentExecutionCompleted"));
    assert.ok(types.includes("TaskCompleted"));

    // Verify global runtime telemetry increments
    const runtimeTel = runtime.getTelemetry();
    assert.equal(runtimeTel.totalExecutions, 1);
    assert.equal(runtimeTel.successfulExecutions, 1);
    assert.equal(runtimeTel.tokensConsumed, 150);
    assert.equal(runtimeTel.costInUSD, 0.003);
  });

  await suite.run("Executing Specific Agent with Context Integration", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    runtime.registerAgent({
      id: "agent_a",
      name: "Agent A",
      description: "Aux helper",
      capabilityTags: [],
      maxExecutionTimeMs: 100
    }, async (ctx) => {
      return "A";
    });

    runtime.registerAgent({
      id: "agent_b",
      name: "Agent B",
      description: "Primary worker",
      capabilityTags: [],
      maxExecutionTimeMs: 100
    }, async (ctx) => {
      ctx.recordStepCompleted("step_1", 25, ["completed step A"]);
      return "B";
    });

    const taskId = store.createTask("Test multi agent resolution");
    // Seed standard task steps inside store
    store.updateStep(taskId, "step_1", { name: "Validate input data" });

    // Execute with explicit target agent B
    const outcome = await runtime.executeTask(taskId, "agent_b");
    assert.equal(outcome, true);

    const state = store.getTaskState(taskId);
    assert.equal(state?.steps[0].status, "completed");
    assert.equal(state?.steps[0].durationMs, 25);
    assert.equal(state?.steps[0].logs?.[0], "completed step A");
  });

  await suite.run("Robust Failure-Path Testing: Missing Task ID", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);
    runtime.registerAgent(baseManifest, async () => "ok");

    await assert.throwsAsync(async () => {
      await runtime.executeTask("non_existent_task_id");
    }, Error);
  });

  await suite.run("Robust Failure-Path Testing: No Registered Agents", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    const taskId = store.createTask("Do work");
    await assert.throwsAsync(async () => {
      await runtime.executeTask(taskId);
    }, Error);
  });

  await suite.run("Robust Failure-Path Testing: Target Agent Not Found", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);
    runtime.registerAgent(baseManifest, async () => "ok");

    const taskId = store.createTask("Do work");
    await assert.throwsAsync(async () => {
      await runtime.executeTask(taskId, "missing_target_agent");
    }, AgentNotFoundError);
  });

  await suite.run("Robust Failure-Path Testing: Handler Exception", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    runtime.registerAgent(baseManifest, async (ctx) => {
      ctx.recordStepFailed("step_fail", "NullPointerException on db link", 15);
      throw new Error("Internal processor fatal exception");
    });

    const taskId = store.createTask("Task prone to failure");
    store.updateStep(taskId, "step_fail", { name: "Connect database" });

    const events: any[] = [];
    bus.subscribe("*", (e) => {
      if (e.type === "AgentExecutionFailed") events.push(e);
    });

    const runOutcome = await runtime.executeTask(taskId);
    assert.equal(runOutcome, false, "Execution must report failure outcome");

    // Check database and telemetry status
    const state = store.getTaskState(taskId);
    assert.equal(state?.status, "failed");
    assert.equal(state?.steps[0].status, "failed");
    assert.equal(state?.steps[0].error, "NullPointerException on db link");

    // Event checking
    assert.equal(events.length, 1);
    assert.ok(events[0].payload.error.includes("Internal processor fatal exception"));

    // Global performance telemetry must log failure count
    const telemetry = runtime.getTelemetry();
    assert.equal(telemetry.totalExecutions, 1);
    assert.equal(telemetry.failedExecutions, 1);
    assert.equal(telemetry.successfulExecutions, 0);
  });

  await suite.run("Task Execution Manual Cancellation Flow", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    const runtime = new AgentRuntime(store, bus);

    let reachedMilestone = false;

    // Agent handler simulating infinite/long-running background loop
    runtime.registerAgent(baseManifest, async (ctx) => {
      for (let i = 0; i < 50; i++) {
        if (ctx.signal.aborted) {
          throw new CancellationException("Aborted manually in handler");
        }
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
      reachedMilestone = true;
      return "finished";
    });

    const taskId = store.createTask("Long running analytical simulation");

    const events: any[] = [];
    bus.subscribe("*", (e) => {
      if (e.type === "AgentExecutionCancelled") events.push(e);
    });

    const execPromise = runtime.executeTask(taskId);

    // Trigger manual runtime cancellation midway
    await new Promise((resolve) => setTimeout(resolve, 15));
    assert.equal(runtime.getActiveExecutions().length, 1, "Task must be marked active during process");
    runtime.cancelTask(taskId);

    const success = await execPromise;
    assert.equal(success, false, "Cancelled tasks must yield failure outcome");
    assert.equal(reachedMilestone, false, "Execution should abort immediately and not finish");

    const state = store.getTaskState(taskId);
    assert.equal(state?.status, "failed", "Cancelled tasks reside in failed state store states");
    assert.equal(runtime.getExecutionStatus(taskId), "cancelled", "Internal tracker should mark cancelled");

    // Verify cancellation telemetry and events
    assert.equal(events.length, 1, "Should dispatch cancel notification");
    const telemetry = runtime.getTelemetry();
    assert.equal(telemetry.totalExecutions, 1);
    assert.equal(telemetry.cancelledExecutions, 1);
  });

  await suite.run("Agent Run Automated Timeout Policy", async () => {
    const store = new InMemoryStateStore();
    const bus = new InMemoryEventBus();
    
    // Low timeout configured in agent manifest
    const strictManifest: AgentManifest = {
      ...baseManifest,
      id: "slow_coach",
      maxExecutionTimeMs: 25
    };

    const runtime = new AgentRuntime(store, bus);
    runtime.registerAgent(strictManifest, async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 150)); // Slow job exceeding limit
      return "too_late";
    });

    const taskId = store.createTask("Slow loading analytical report");

    const events: any[] = [];
    bus.subscribe("*", (e) => {
      if (e.type === "AgentExecutionTimedOut") events.push(e);
    });

    const success = await runtime.executeTask(taskId);
    assert.equal(success, false, "Timed out jobs yield false");

    const state = store.getTaskState(taskId);
    assert.equal(state?.status, "failed");
    assert.equal(runtime.getExecutionStatus(taskId), "timed_out");

    // Event check
    assert.equal(events.length, 1, "Must notify of absolute timeout trigger");
    assert.ok(events[0].payload.error.includes("Agent run exceeded absolute limit"));

    // Global counts updated
    const telemetry = runtime.getTelemetry();
    assert.equal(telemetry.totalExecutions, 1);
    assert.equal(telemetry.timedOutExecutions, 1);
    assert.equal(telemetry.successfulExecutions, 0);
  });

  suite.report();
}

runTests().catch(err => {
  console.error("Fatal test suite crash:", err);
  process.exit(1);
});
