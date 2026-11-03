/**
 * @file /src/kernel/tests/StateStore.test.ts
 * @description Zero-dependency comprehensive unit test suite for InMemoryStateStore.
 * Tests positive paths, illegal state transitions, cumulative log increments, and deep clone insulation.
 */

import { InMemoryStateStore } from "../StateStore";
import { TaskStatus, TaskStep } from "../types";

/**
 * Lightweight test framework helpers.
 */
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
    console.log(`Test Execution Finished.`);
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

const assert = {
  equal: <T>(actual: T, expected: T, msg?: string) => {
    if (actual !== expected) {
      throw new Error(`${msg || "Assertion failed"}: expected ${expected}, got ${actual}`);
    }
  },
  notEqual: <T>(actual: T, expected: T, msg?: string) => {
    if (actual === expected) {
      throw new Error(`${msg || "Assertion failed"}: expected ${actual} to not equal ${expected}`);
    }
  },
  ok: (val: any, msg?: string) => {
    if (!val) {
      throw new Error(`${msg || "Assertion failed"}: value was not truthy`);
    }
  },
  throws: (fn: () => void, matchText?: string, msg?: string) => {
    try {
      fn();
    } catch (err: any) {
      if (matchText && !err.message.includes(matchText)) {
        throw new Error(`${msg || "Assertion failed"}: expected error containing "${matchText}", got "${err.message}"`);
      }
      return; // success
    }
    throw new Error(`${msg || "Assertion failed"}: expected block to throw an error but it succeeded`);
  }
};

const runner = new TestRunner();

// --- TEST CASES ---

runner.run("Create Task - Valid and Invalid Inputs", () => {
  const store = new InMemoryStateStore();

  // Test standard initialization
  const goal = "Audit repository security rules";
  const taskId = store.createTask(goal);

  assert.ok(taskId, "Task ID must be generated");
  assert.ok(taskId.startsWith("task_"), "Task ID must follow prefix convention");

  const state = store.getTaskState(taskId);
  assert.ok(state, "Task state must be fetchable");
  assert.equal(state?.goal, goal, "Goal must match requested task goal");
  assert.equal(state?.status, "pending", "Initial task state must be pending");
  assert.equal(state?.steps.length, 0, "Initial steps list must be empty");
  assert.equal(state?.telemetry.tokensUsed, 0, "Initial tokensUsed must be 0");

  // Test empty goal rejection
  assert.throws(() => {
    store.createTask("");
  }, "goal string cannot be empty", "Should reject empty goal strings");

  assert.throws(() => {
    store.createTask("   ");
  }, "goal string cannot be empty", "Should reject whitespace goal strings");
});

runner.run("State Machine Transition Constraints", () => {
  const store = new InMemoryStateStore();
  const taskId = store.createTask("Verify linter workflow");

  // Valid path transition sequence
  // pending -> planning
  store.updateTaskStatus(taskId, "planning");
  assert.equal(store.getTaskState(taskId)?.status, "planning");

  // planning -> running
  store.updateTaskStatus(taskId, "running");
  assert.equal(store.getTaskState(taskId)?.status, "running");

  // running -> verification
  store.updateTaskStatus(taskId, "verification");
  assert.equal(store.getTaskState(taskId)?.status, "verification");

  // verification -> reflection
  store.updateTaskStatus(taskId, "reflection");
  assert.equal(store.getTaskState(taskId)?.status, "reflection");

  // reflection -> completed
  store.updateTaskStatus(taskId, "completed");
  assert.equal(store.getTaskState(taskId)?.status, "completed");

  // Terminal state: completed -> planning (Illegal)
  assert.throws(() => {
    store.updateTaskStatus(taskId, "planning");
  }, "Illegal State Machine Transition", "Should reject transition from terminal state");
});

runner.run("State Machine - Alternate & Illegal Transitions", () => {
  const store = new InMemoryStateStore();
  const taskId = store.createTask("Verify fallback logic");

  // pending -> running (Illegal)
  assert.throws(() => {
    store.updateTaskStatus(taskId, "running");
  }, "Illegal State Machine Transition", "Should block pending -> running");

  // pending -> planning (Legal)
  store.updateTaskStatus(taskId, "planning");

  // planning -> failed (Legal fallback)
  store.updateTaskStatus(taskId, "failed");
  assert.equal(store.getTaskState(taskId)?.status, "failed");

  // failed -> planning (Illegal terminal outbound)
  assert.throws(() => {
    store.updateTaskStatus(taskId, "planning");
  }, "Illegal State Machine Transition", "Should block terminal failed outbound transitions");
});

runner.run("Dynamic Steps Initialization and Updates", () => {
  const store = new InMemoryStateStore();
  const taskId = store.createTask("Generate system specifications");

  // Add a new dynamic step
  const stepId1 = "step_compile";
  store.updateStep(taskId, stepId1, {
    name: "Run tsc",
    status: "running",
    toolId: "compiler.run"
  });

  let state = store.getTaskState(taskId);
  assert.equal(state?.steps.length, 1);
  const step1 = state?.steps[0];
  assert.equal(step1?.stepId, stepId1);
  assert.equal(step1?.name, "Run tsc");
  assert.equal(step1?.status, "running");
  assert.equal(step1?.toolId, "compiler.run");
  assert.equal(step1?.logs?.length, 0);

  // Append logs and complete the step
  store.updateStep(taskId, stepId1, {
    status: "completed",
    logs: ["Compilation started...", "Found 0 errors.", "Completed in 45ms."],
    durationMs: 45
  });

  state = store.getTaskState(taskId);
  assert.equal(state?.steps.length, 1);
  const updatedStep1 = state?.steps[0];
  assert.equal(updatedStep1?.status, "completed");
  assert.equal(updatedStep1?.durationMs, 45);
  assert.equal(updatedStep1?.logs?.length, 3);
  assert.equal(updatedStep1?.logs?.[1], "Found 0 errors.");

  // Add more logs sequentially (must accumulate)
  store.updateStep(taskId, stepId1, {
    logs: ["Persisting context results."]
  });

  state = store.getTaskState(taskId);
  assert.equal(state?.steps[0]?.logs?.length, 4, "Logs must be accumulated chronologically");
  assert.equal(state?.steps[0]?.logs?.[3], "Persisting context results.");
});

runner.run("Cumulative Analytics & Telemetry Tracking", () => {
  const store = new InMemoryStateStore();
  const taskId = store.createTask("Telemetry stress test");

  // Initial increment
  store.recordTelemetry(taskId, {
    tokensUsed: 1500,
    promptTokens: 1000,
    completionTokens: 500,
    costInUSD: 0.0035,
    durationMs: 400,
    toolInvocations: { "fs.read": 3, "terminal.run": 1 }
  });

  let state = store.getTaskState(taskId);
  assert.equal(state?.telemetry.tokensUsed, 1500);
  assert.equal(state?.telemetry.promptTokens, 1000);
  assert.equal(state?.telemetry.completionTokens, 500);
  assert.equal(state?.telemetry.costInUSD, 0.0035);
  assert.equal(state?.telemetry.durationMs, 400);
  assert.equal(state?.telemetry.toolInvocations["fs.read"], 3);
  assert.equal(state?.telemetry.toolInvocations["terminal.run"], 1);

  // Cumulative secondary increment
  store.recordTelemetry(taskId, {
    tokensUsed: 1000,
    promptTokens: 800,
    completionTokens: 200,
    costInUSD: 0.0020,
    durationMs: 150,
    toolInvocations: { "fs.read": 2, "fs.write": 1 }
  });

  state = store.getTaskState(taskId);
  assert.equal(state?.telemetry.tokensUsed, 2500, "Cumulative tokens summation error");
  assert.equal(state?.telemetry.promptTokens, 1800);
  assert.equal(state?.telemetry.completionTokens, 700);
  assert.equal(state?.telemetry.costInUSD, 0.0055);
  assert.equal(state?.telemetry.durationMs, 550);
  assert.equal(state?.telemetry.toolInvocations["fs.read"], 5, "Tool counts must be cumulative");
  assert.equal(state?.telemetry.toolInvocations["terminal.run"], 1);
  assert.equal(state?.telemetry.toolInvocations["fs.write"], 1);
});

runner.run("Strict Encapsulation Isolation (Deep Clones)", () => {
  const store = new InMemoryStateStore();
  const taskId = store.createTask("Sandbox verification");

  const state1 = store.getTaskState(taskId);
  assert.ok(state1);

  // Attempt to directly mutate returned reference array
  state1!.steps.push({
    stepId: "illegal_injected_step",
    name: "Malicious insertion",
    status: "running"
  });

  // Re-fetch should be completely insulated
  const state2 = store.getTaskState(taskId);
  assert.equal(state2?.steps.length, 0, "State returned must be deep-cloned to protect system consistency.");
});

runner.run("List Tasks and Sort Behavior", () => {
  const store = new InMemoryStateStore();

  const spinWait = (ms: number) => {
    const start = Date.now();
    while (Date.now() - start < ms) {}
  };

  const task1 = store.createTask("Task A");
  spinWait(5); // Ensure distinct timestamps
  const task2 = store.createTask("Task B");
  spinWait(5); // Ensure distinct timestamps
  const task3 = store.createTask("Task C");

  const list = store.listTasks();
  assert.equal(list.length, 3);
  // Default sorting must list most recent tasks first (descending order)
  assert.equal(list[0].taskId, task3, "listTasks must sort by newest first");
  assert.equal(list[1].taskId, task2);
  assert.equal(list[2].taskId, task1);
});

// Run all
runner.finish();
