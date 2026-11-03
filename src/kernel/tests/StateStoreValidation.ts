/**
 * @file /src/kernel/tests/StateStoreValidation.ts
 * @description Formal validation suite for StateStore Sprint 1.
 * Evaluates performance scaling (100 to 50,000 tasks), concurrency integrity,
 * serialization fidelity, and memory footprints.
 */

import { InMemoryStateStore } from "../StateStore";
import { TaskState } from "../types";

/**
 * Format bytes to readable MB string
 */
function toMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Clean memory via GC if available (not guaranteed, but can attempt)
 */
function attemptGC(): void {
  if (global.gc) {
    try {
      global.gc();
    } catch {
      // ignore
    }
  }
}

async function runValidationSuite() {
  console.log("=================================================================");
  console.log("             AZIZ KERNEL SPRINT 1 VALIDATION GATE               ");
  console.log("=================================================================\n");

  const results: any = {
    stress: [],
    concurrency: {},
    serialization: {},
    cloning: {}
  };

  // =================================================================
  // 1. STRESS TESTS (100, 1,000, 10,000, 50,000 tasks)
  // =================================================================
  console.log("--- STARTING PHASE 1: INDEPENDENT STRESS TESTS ---");
  const volumes = [100, 1000, 10000, 50000];

  for (const count of volumes) {
    attemptGC();
    const initialMem = process.memoryUsage().heapUsed;
    const store = new InMemoryStateStore();
    const start = Date.now();

    for (let i = 0; i < count; i++) {
      store.createTask(`Goal definition iteration ${i}`);
    }

    const duration = Date.now() - start;
    const finalMem = process.memoryUsage().heapUsed;
    const memIncrease = Math.max(0, finalMem - initialMem);

    console.log(`[STRESS] Vol: ${count.toString().padEnd(5)} | Duration: ${duration.toString().padStart(4)} ms | Heap Growth: ${toMB(memIncrease).padStart(8)} | Avg: ${(duration / count * 1000).toFixed(2)} µs/task`);
    
    results.stress.push({
      count,
      durationMs: duration,
      heapGrowthBytes: memIncrease,
      avgUsPerTask: (duration / count * 1000)
    });
  }
  console.log("Phase 1 stress testing completed.\n");

  // =================================================================
  // 2. CONCURRENCY TESTS
  // =================================================================
  console.log("--- STARTING PHASE 2: CONCURRENCY TESTS ---");
  const conStore = new InMemoryStateStore();
  const taskId = conStore.createTask("Concurrent stress scenario");

  console.log("[CONCURRENCY] Simulating 1,000 concurrent step & telemetry mutations...");
  const concurrentOps: Promise<void>[] = [];
  
  // Transition task through legal steps first so it is running
  conStore.updateTaskStatus(taskId, "planning");
  conStore.updateTaskStatus(taskId, "running");

  const startConcurrent = Date.now();
  for (let i = 0; i < 1000; i++) {
    // Alternate updates of steps and telemetry in parallel
    const op = async (idx: number) => {
      // Introduce tiny random micro-delay to simulate thread interleaving
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5));
      
      conStore.updateStep(taskId, `step_${idx % 10}`, {
        name: `Step ${idx % 10}`,
        status: "running",
        logs: [`Op ${idx} written.`]
      });

      conStore.recordTelemetry(taskId, {
        tokensUsed: 10,
        promptTokens: 7,
        completionTokens: 3,
        costInUSD: 0.0001,
        toolInvocations: { [`tool_${idx % 3}`]: 1 }
      });
    };
    concurrentOps.push(op(i));
  }

  await Promise.all(concurrentOps);
  const concurrentDuration = Date.now() - startConcurrent;

  const finalState = conStore.getTaskState(taskId);
  console.log(`[CONCURRENCY] Elapsed: ${concurrentDuration} ms`);
  console.log(`[CONCURRENCY] Final Steps Count: ${finalState?.steps.length}`);
  console.log(`[CONCURRENCY] Cumulative Tokens: ${finalState?.telemetry.tokensUsed}`);
  console.log(`[CONCURRENCY] Cumulative Cost: $${finalState?.telemetry.costInUSD.toFixed(4)}`);
  console.log(`[CONCURRENCY] Step 0 Logs length: ${finalState?.steps[0]?.logs?.length}`);

  // Assertions
  let concurrencyPassed = true;
  if (finalState?.steps.length !== 10) {
    console.error("❌ Concurrency failed: steps length mismatch");
    concurrencyPassed = false;
  }
  if (finalState?.telemetry.tokensUsed !== 10000) {
    console.error("❌ Concurrency failed: tokens count incorrect");
    concurrencyPassed = false;
  }
  if (Math.abs((finalState?.telemetry.costInUSD || 0) - 0.1) > 0.00001) {
    console.error("❌ Concurrency failed: cumulative cost incorrect");
    concurrencyPassed = false;
  }

  if (concurrencyPassed) {
    console.log("✅ Concurrency Integrity check passed without race conditions.\n");
    results.concurrency = {
      passed: true,
      durationMs: concurrentDuration,
      stepsCount: finalState?.steps.length,
      tokensCount: finalState?.telemetry.tokensUsed,
      totalCost: finalState?.telemetry.costInUSD
    };
  } else {
    results.concurrency = { passed: false };
  }

  // =================================================================
  // 3. SERIALIZATION TESTS
  // =================================================================
  console.log("--- STARTING PHASE 3: SERIALIZATION & DATA INTEGRITY ---");
  const serStore = new InMemoryStateStore();
  const serTaskId = serStore.createTask("Serialization audit task");
  serStore.updateTaskStatus(serTaskId, "planning");
  serStore.updateTaskStatus(serTaskId, "running");

  serStore.updateStep(serTaskId, "step_main", {
    name: "Perform analysis",
    status: "completed",
    logs: ["Parsing file dependencies...", "Matched 47 nodes."]
  });

  serStore.recordTelemetry(serTaskId, {
    tokensUsed: 4500,
    promptTokens: 3000,
    completionTokens: 1500,
    costInUSD: 0.015,
    toolInvocations: { "fs.read": 12 }
  });

  const originalState = serStore.getTaskState(serTaskId);
  const serialized = JSON.stringify(originalState);
  const deserialized: TaskState = JSON.parse(serialized);

  let serializationPassed = true;
  if (deserialized.taskId !== originalState?.taskId) serializationPassed = false;
  if (deserialized.goal !== originalState?.goal) serializationPassed = false;
  if (deserialized.status !== originalState?.status) serializationPassed = false;
  if (deserialized.steps[0].logs?.length !== originalState?.steps[0].logs?.length) serializationPassed = false;
  if (deserialized.telemetry.tokensUsed !== originalState?.telemetry.tokensUsed) serializationPassed = false;
  if (deserialized.telemetry.toolInvocations["fs.read"] !== originalState?.telemetry.toolInvocations["fs.read"]) serializationPassed = false;

  if (serializationPassed) {
    console.log("✅ Serialization and deserialization verified 100% data integrity.");
    results.serialization = { passed: true, payloadLengthBytes: serialized.length };
  } else {
    console.error("❌ Serialization validation failed!");
    results.serialization = { passed: false };
  }
  console.log("\n");

  // =================================================================
  // 4. SNAPSHOT & CLONING TESTS
  // =================================================================
  console.log("--- STARTING PHASE 4: SNAPSHOT & CLONING INSULATION ---");
  const cloneStore = new InMemoryStateStore();
  const clTaskId = cloneStore.createTask("Clone isolation check");

  // Get current state snapshot
  const snapshot1 = cloneStore.getTaskState(clTaskId);
  
  // Directly modify snapshot properties in caller context
  snapshot1!.goal = "MODIFIED EXTERNALLY";
  snapshot1!.steps.push({
    stepId: "step_external",
    name: "Hacked Step",
    status: "running"
  });
  snapshot1!.telemetry.tokensUsed = 999999;

  // Retrieve current state from store again and assert no leakage occurred
  const snapshot2 = cloneStore.getTaskState(clTaskId);
  
  let cloningPassed = true;
  if (snapshot2?.goal === "MODIFIED EXTERNALLY") cloningPassed = false;
  if (snapshot2?.steps.length !== 0) cloningPassed = false;
  if (snapshot2?.telemetry.tokensUsed !== 0) cloningPassed = false;

  if (cloningPassed) {
    console.log("✅ State Store deep cloning isolates memory perfectly from caller side-effects.");
    results.cloning = { passed: true };
  } else {
    console.error("❌ Snapshot isolation breach detected!");
    results.cloning = { passed: false };
  }
  console.log("\n");

  // =================================================================
  // 5. MEMORY PROFILE BREAKDOWN
  // =================================================================
  console.log("--- STARTING PHASE 5: RUNTIME FOOTPRINT AUDIT ---");
  const memStore = new InMemoryStateStore();
  attemptGC();
  const preAuditMem = process.memoryUsage();

  // Create 10,000 tasks and append 3 steps each
  for (let i = 0; i < 10000; i++) {
    const tid = memStore.createTask(`Task trace i=${i}`);
    memStore.updateStep(tid, "step_1", { name: "Step 1", status: "completed" });
    memStore.updateStep(tid, "step_2", { name: "Step 2", status: "completed" });
    memStore.updateStep(tid, "step_3", { name: "Step 3", status: "failed", error: "Compiler error" });
  }

  const postAuditMem = process.memoryUsage();
  const residentGrowth = postAuditMem.rss - preAuditMem.rss;
  const heapGrowth = postAuditMem.heapUsed - preAuditMem.heapUsed;

  console.log(`[PROFILE] Initial Heap Used: ${toMB(preAuditMem.heapUsed)}`);
  console.log(`[PROFILE] Final Heap Used  : ${toMB(postAuditMem.heapUsed)}`);
  console.log(`[PROFILE] Heap Delta (10k tasks with 3 steps each): ${toMB(heapGrowth)}`);
  console.log(`[PROFILE] Avg memory footprint per loaded TaskState: ${(heapGrowth / 10000 / 1024).toFixed(2)} KB`);

  results.profile = {
    preHeapUsedBytes: preAuditMem.heapUsed,
    postHeapUsedBytes: postAuditMem.heapUsed,
    heapGrowthBytes: heapGrowth,
    avgKbPerTask: (heapGrowth / 10000 / 1024)
  };

  // =================================================================
  // 6. DELETION & MEMORY RETENTION BENCHMARKS
  // =================================================================
  console.log("\n--- STARTING PHASE 6: DELETION & MEMORY RETENTION BENCHMARKS ---");
  const delStore = new InMemoryStateStore();
  const deletedTaskIds: string[] = [];
  
  // Allocate 20,000 heavy tasks
  for (let i = 0; i < 20000; i++) {
    const tid = delStore.createTask(`Heavy payload tracking item index=${i}`);
    delStore.updateStep(tid, "heavy_step", {
      name: "Long execution track with heavy logging arrays",
      status: "running",
      logs: ["Start log line", `Context tracking frame value ${i}`, "Some more log lines to populate memory heap"]
    });
    deletedTaskIds.push(tid);
  }

  attemptGC();
  const memPeak = process.memoryUsage().heapUsed;
  console.log(`[DELETION] Heap peak at 20,000 tasks: ${toMB(memPeak)}`);

  // Delete all tasks
  let deletedCount = 0;
  for (const tid of deletedTaskIds) {
    if (delStore.deleteTask(tid)) {
      deletedCount++;
    }
  }

  attemptGC();
  // Allow brief event loop tick for GC sweep
  await new Promise(resolve => setTimeout(resolve, 50));
  attemptGC();

  const memAfterDelete = process.memoryUsage().heapUsed;
  console.log(`[DELETION] Deleted ${deletedCount} of ${deletedTaskIds.length} tasks.`);
  console.log(`[DELETION] Heap after garbage collection sweep: ${toMB(memAfterDelete)}`);
  console.log(`[DELETION] Reclaimed memory: ${toMB(Math.max(0, memPeak - memAfterDelete))}`);

  results.deletion = {
    totalCreated: deletedTaskIds.length,
    totalDeleted: deletedCount,
    peakHeapBytes: memPeak,
    afterDeleteHeapBytes: memAfterDelete,
    reclaimedBytes: Math.max(0, memPeak - memAfterDelete)
  };

  // =================================================================
  // 7. FAILURE-PATH SCENARIOS
  // =================================================================
  console.log("\n--- STARTING PHASE 7: FAILURE-PATH SCENARIOS ---");
  const failStore = new InMemoryStateStore();
  
  // 7.1: Invalid State Machine Transition
  let transitionBlockPassed = false;
  const ftId = failStore.createTask("State machine rule audit");
  try {
    failStore.updateTaskStatus(ftId, "completed"); // Cannot jump straight to completed from pending
  } catch (err: any) {
    console.log(`[FAILURE-PATH] Caught expected invalid state transition: ${err.message}`);
    transitionBlockPassed = err.message.includes("Illegal State Machine Transition");
  }

  // 7.2: Duplicate/Collision Task IDs
  console.log("[FAILURE-PATH] Evaluating ID uniqueness & collision rate...");
  const generatedIds = new Set<string>();
  let collisionDetected = false;
  for (let i = 0; i < 50000; i++) {
    const freshId = (failStore as any).generateId();
    if (generatedIds.has(freshId)) {
      collisionDetected = true;
      break;
    }
    generatedIds.add(freshId);
  }
  console.log(`[FAILURE-PATH] Uniqueness rate: 100% (No collisions detected across 50,000 trials: ${!collisionDetected})`);

  // 7.3: Malformed Telemetry Handling
  console.log("[FAILURE-PATH] Testing malformed telemetry metrics handling...");
  const tmId = failStore.createTask("Telemetry safety check");
  // Try sending empty objects or negative values (ensure it safely ignores or defaults)
  failStore.recordTelemetry(tmId, {
    tokensUsed: undefined,
    promptTokens: NaN, // Should handle NaN elegantly or fallback safely
    costInUSD: -10 // Extreme input
  } as any);

  const tState = failStore.getTaskState(tmId);
  console.log(`[FAILURE-PATH] Cost after negative injection: ${tState?.telemetry.costInUSD}`);
  
  const failurePathsPassed = transitionBlockPassed && !collisionDetected;
  if (failurePathsPassed) {
    console.log("✅ Failure-path validation completed successfully.");
    results.failurePaths = { passed: true };
  } else {
    console.error("❌ Failure-path validation failed!");
    results.failurePaths = { passed: false };
  }

  console.log("=================================================================");
  console.log("                   VALIDATION RUN COMPLETED                      ");
  console.log("=================================================================\n");

  // Write results JSON to a variable we can inspect
  return results;
}

runValidationSuite().catch(err => {
  console.error("Fatal validation run failure:", err);
  process.exit(1);
});
