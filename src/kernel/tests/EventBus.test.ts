/**
 * @file /src/kernel/tests/EventBus.test.ts
 * @description Comprehensive unit test suite for InMemoryEventBus.
 * Verifies specific routing, wildcard matching, unsubscribe callbacks, journaling, and replay isolation.
 */

import { InMemoryEventBus } from "../EventBus";
import { KernelEvent } from "../types";

class TestSuite {
  private passed = 0;
  private failed = 0;

  public run(name: string, fn: () => void): void {
    console.log(`[TEST] Running: ${name}...`);
    try {
      fn();
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
    console.log(`Event Bus Unit Tests Complete.`);
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
  }
};

const suite = new TestSuite();

// --- TEST CASES ---

suite.run("Publish & Subscribe Specific Routing", () => {
  const bus = new InMemoryEventBus();
  const received: KernelEvent[] = [];

  bus.subscribe("TaskCreated", (event) => {
    received.push(event);
  });

  // Publish matching event
  bus.publish({
    taskId: "task_001",
    type: "TaskCreated",
    payload: { goal: "Design architecture validation" }
  });

  // Publish non-matching event
  bus.publish({
    taskId: "task_001",
    type: "PlanningStarted",
    payload: {}
  });

  assert.equal(received.length, 1, "Only TaskCreated event should be intercepted");
  assert.equal(received[0].taskId, "task_001");
  assert.equal(received[0].payload.goal, "Design architecture validation");
  assert.ok(received[0].eventId.startsWith("ev_"), "EventId should possess the standard tracking prefix");
  assert.ok(received[0].timestamp, "Timestamp should be generated");
});

suite.run("Wildcard Subscribe Channels", () => {
  const bus = new InMemoryEventBus();
  const received: KernelEvent[] = [];

  bus.subscribe("*", (event) => {
    received.push(event);
  });

  bus.publish({
    taskId: "task_100",
    type: "TaskCreated",
    payload: {}
  });

  bus.publish({
    taskId: "task_100",
    type: "ToolExecuted",
    payload: { toolId: "fs.read" }
  });

  assert.equal(received.length, 2, "Wildcard listener should receive all events");
  assert.equal(received[0].type, "TaskCreated");
  assert.equal(received[1].type, "ToolExecuted");
});

suite.run("Subscription Unsubscribe Lifecycle", () => {
  const bus = new InMemoryEventBus();
  let counter = 0;

  const unsubscribe = bus.subscribe("CheckpointCreated", () => {
    counter++;
  });

  bus.publish({ taskId: "task_x", type: "CheckpointCreated", payload: {} });
  assert.equal(counter, 1, "Counter should be incremented once");

  // Cleanup subscriber
  unsubscribe();

  bus.publish({ taskId: "task_x", type: "CheckpointCreated", payload: {} });
  assert.equal(counter, 1, "Counter should remain 1 after unsubscribe clean up");
});

suite.run("Event Journal Log & Memory Isolation", () => {
  const bus = new InMemoryEventBus();

  bus.publish({
    taskId: "task_99",
    type: "VerificationPassed",
    payload: { testRunCount: 12 }
  });

  const journal = bus.getJournal();
  assert.equal(journal.length, 1);
  assert.equal(journal[0].type, "VerificationPassed");

  // Verify memory reference isolation (mutating journal should not modify inner state)
  journal[0].type = "MODIFIED_EXTERNALLY";
  assert.equal(bus.getJournal()[0].type, "VerificationPassed", "Journal copy must isolate memory references");
});

suite.run("Event Replay with Filters", () => {
  const bus = new InMemoryEventBus();

  bus.publish({ taskId: "task_1", type: "TaskCreated", payload: {} });
  bus.publish({ taskId: "task_1", type: "ToolExecuted", payload: { tool: "run" } });
  bus.publish({ taskId: "task_2", type: "TaskCreated", payload: {} });

  // Replay without filters
  const allReplayed: KernelEvent[] = [];
  bus.replay((ev) => allReplayed.push(ev));
  assert.equal(allReplayed.length, 3);

  // Replay filtered by Task ID
  const task1Replayed: KernelEvent[] = [];
  bus.replay((ev) => task1Replayed.push(ev), { taskId: "task_1" });
  assert.equal(task1Replayed.length, 2);
  assert.equal(task1Replayed[1].type, "ToolExecuted");

  // Replay filtered by Event Type
  const typeReplayed: KernelEvent[] = [];
  bus.replay((ev) => typeReplayed.push(ev), { type: "TaskCreated" });
  assert.equal(typeReplayed.length, 2);
  assert.equal(typeReplayed[0].taskId, "task_1");
  assert.equal(typeReplayed[1].taskId, "task_2");
});

suite.run("Fault Tolerant Uncaught Listener Exceptions", () => {
  const bus = new InMemoryEventBus();
  let secondaryTriggered = false;

  bus.subscribe("TaskCompleted", () => {
    throw new Error("Simulated bad listener crash failure");
  });

  bus.subscribe("TaskCompleted", () => {
    secondaryTriggered = true;
  });

  // Publish event, should not crash or stop execution of downstream subscribers
  bus.publish({ taskId: "task_fail", type: "TaskCompleted", payload: {} });

  assert.ok(secondaryTriggered, "Downstream listeners must still fire even if upstream ones crash");
});

suite.report();
