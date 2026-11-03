/**
 * @file /src/kernel/tests/Planner.test.ts
 * @description Comprehensive Unit Tests for the Deterministic Task Planner.
 * Verifies plan formulation, step status initial state, keyword capability matching, missing capability
 * exceptions, circular dependency detection, and event bus pub-sub verification.
 */

import { Planner, InvalidGoalError, MissingCapabilityError, CircularPlanError } from "../Planner";
import { InMemoryToolRegistry } from "../ToolRegistry";
import { InMemoryEventBus } from "../EventBus";
import { InMemoryStateStore } from "../StateStore";
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
    console.log(`Planner Unit Tests Complete.`);
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
  throws: async (fn: () => Promise<any> | any, expectedErrorClass: any, msg?: string) => {
    try {
      await fn();
    } catch (err: any) {
      if (err instanceof expectedErrorClass) {
        return; // Passed
      }
      throw new Error(`${msg || "Throws check failed"}: expected error of type ${expectedErrorClass.name}, got ${err?.name || typeof err}`);
    }
    throw new Error(`${msg || "Throws check failed"}: expected error of type ${expectedErrorClass.name}, but no error was thrown`);
  }
};

const suite = new TestSuite();

async function runPlannerTests() {
  // Setup standard environment dependencies
  const stateStore = new InMemoryStateStore();
  const eventBus = new InMemoryEventBus();
  const toolRegistry = new InMemoryToolRegistry({
    eventBus,
    stateStore,
    grantedPermissions: ["math_allowed", "sys_audit"]
  });

  // Register math tool
  const calculatorManifest: ToolManifest = {
    id: "calculator",
    name: "Calculator",
    description: "Evaluates mathematical expressions",
    permissions: ["math_allowed"],
    riskLevel: "low",
    timeoutMs: 100,
    maxRetries: 1,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" }
  };
  toolRegistry.registerTool(calculatorManifest, async () => ({}));

  // Register SRE audit tool
  const linterManifest: ToolManifest = {
    id: "system_lint_audit",
    name: "System Lint Audit",
    description: "Diagnoses codebase configurations and rules compliance",
    permissions: ["sys_audit"],
    riskLevel: "medium",
    timeoutMs: 100,
    maxRetries: 0,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" }
  };
  toolRegistry.registerTool(linterManifest, async () => ({}));

  const planner = new Planner(toolRegistry, eventBus);

  // 1. Happy Path - Math Goal
  await suite.run("Formulate execution plan for a math calculation goal", async () => {
    const taskId = "task_math_happy";
    const goal = "Perform math validation of 15 + 27";
    const context = { files: ["index.html", "src/main.tsx"] };

    const plan = await planner.createPlan(taskId, goal, context);
    
    assert.equal(plan.length, 3, "Math plan should generate exactly 3 steps");
    assert.equal(plan[0].stepId, "step_0", "First step ID is correct");
    assert.equal(plan[0].status, "pending", "Steps should initialize in pending status");
    assert.equal(plan[1].toolId, "calculator", "Second step maps correctly to the calculator tool");
    assert.equal(plan[2].toolId, undefined, "Third step has no tool mapping");
  });

  // 2. Happy Path - SRE / Compliance Goal
  await suite.run("Formulate execution plan for an SRE compliance goal", async () => {
    const taskId = "task_sre_happy";
    const goal = "Run standard compliance audit on current directory";
    const context = { files: ["package.json"] };

    const plan = await planner.createPlan(taskId, goal, context);

    assert.equal(plan.length, 3, "SRE plan should generate exactly 3 steps");
    assert.equal(plan[1].toolId, "system_lint_audit", "Linter tool should be correctly bound");
  });

  // 3. Validation - Invalid Input Guard
  await suite.run("Throw InvalidGoalError for empty or null goals", async () => {
    await assert.throws(async () => {
      await planner.createPlan("task_invalid_1", "", { files: [] });
    }, InvalidGoalError, "Empty goal should throw InvalidGoalError");

    await assert.throws(async () => {
      await planner.createPlan("", "Valid Goal", { files: [] });
    }, InvalidGoalError, "Empty Task ID should throw InvalidGoalError");
  });

  // 4. Validation - Missing Capability (Explicitly requested unregistered tool)
  await suite.run("Throw MissingCapabilityError when explicitly requesting a missing tool", async () => {
    await assert.throws(async () => {
      await planner.createPlan("task_missing_cap_1", "Make a cake requires tool: baker_oven_v1", { files: [] });
    }, MissingCapabilityError, "Unregistered tool must fail with MissingCapabilityError");

    await assert.throws(async () => {
      // Missing math capability explicitly requested
      const emptyRegistry = new InMemoryToolRegistry({ eventBus, stateStore, grantedPermissions: [] });
      const strictPlanner = new Planner(emptyRegistry, eventBus);
      await strictPlanner.createPlan("task_missing_cap_2", "Evaluate math 5 + 9 requires math_allowed", { files: [] });
    }, MissingCapabilityError, "Missing math capability must fail with MissingCapabilityError");
  });

  // 5. Validation - Circular Dependency Detection
  await suite.run("Throw CircularPlanError when circular dependencies exist in workspace symbols graph", async () => {
    const cyclicContext = {
      files: ["A.ts", "B.ts"],
      symbolsGraph: {
        "A.ts": ["B.ts"],
        "B.ts": ["A.ts"] // Cycle: A -> B -> A
      }
    };

    await assert.throws(async () => {
      await planner.createPlan("task_cyclic_1", "Compile the codebase", cyclicContext);
    }, CircularPlanError, "Cyclic dependency in symbolsGraph must throw CircularPlanError");

    const nonCyclicContext = {
      files: ["A.ts", "B.ts", "C.ts"],
      symbolsGraph: {
        "A.ts": ["B.ts", "C.ts"],
        "B.ts": ["C.ts"],
        "C.ts": [] // Directed acyclic graph (DAG)
      }
    };

    const plan = await planner.createPlan("task_noncyclic_1", "Compile the codebase", nonCyclicContext);
    assert.ok(plan.length > 0, "DAG should plan without throwing error");
  });

  // 6. Event Bus Integration
  await suite.run("Verify Event Bus receives planning started and completed events", async () => {
    const eventsJournal: KernelEvent[] = [];
    const localEventBus = new InMemoryEventBus();
    localEventBus.subscribe("*", (e) => eventsJournal.push(e));

    const testPlanner = new Planner(toolRegistry, localEventBus);
    const taskId = "task_event_check";
    await testPlanner.createPlan(taskId, "Run standard SRE checks", { files: [] });

    assert.equal(eventsJournal.length, 2, "Exactly two events must be captured");
    assert.equal(eventsJournal[0].type, "PlanningStarted", "First event must be PlanningStarted");
    assert.equal(eventsJournal[0].taskId, taskId, "First event taskId must match");
    assert.equal(eventsJournal[0].payload.goal, "Run standard SRE checks", "Goal payload must match");

    assert.equal(testPlanner.planner_version, "1.0.0-rc2", "Planner should expose correct version");
    assert.equal(eventsJournal[1].type, "PlanningCompleted", "Second event must be PlanningCompleted");
    assert.equal(eventsJournal[1].taskId, taskId, "Second event taskId must match");
    assert.equal(eventsJournal[1].payload.stepsCount, 3, "Steps count must be passed in payload");
    assert.equal(eventsJournal[1].payload.planner_version, "1.0.0-rc2", "PlanningCompleted event must include planner_version");
    assert.ok(Array.isArray(eventsJournal[1].payload.stepsSummary), "Steps summary must be array");
    assert.equal(eventsJournal[1].payload.stepsSummary[1].toolId, "system_lint_audit", "Linter tool reference is accurate inside event");
  });

  suite.report();
}

runPlannerTests().catch((err) => {
  console.error("Fatal exception during Planner unit testing:", err);
  process.exit(1);
});
