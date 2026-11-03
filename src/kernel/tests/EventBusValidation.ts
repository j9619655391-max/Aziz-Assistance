/**
 * @file /src/kernel/tests/EventBusValidation.ts
 * @description In-depth validation benchmarks for the InMemoryEventBus.
 * Profiles high-frequency event throughput, wildcard vs specific dispatch latencies,
 * memory leak audits on subscribe/unsubscribe lifecycles, and filtration replay performance.
 */

import { InMemoryEventBus } from "../EventBus";
import { KernelEvent } from "../types";

function toMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function attemptGC(): void {
  if (global.gc) {
    try {
      global.gc();
    } catch {
      // ignore
    }
  }
}

async function runEventBusValidation() {
  console.log("=================================================================");
  console.log("             AZIZ KERNEL SPRINT 2 VALIDATION GATE               ");
  console.log("=================================================================\n");

  const results: any = {
    throughput: [],
    subscriberOverhead: {},
    leakAudit: {},
    replayPerformance: {}
  };

  // =================================================================
  // 1. HIGH-VOLUME THROUGHPUT BENCHMARK
  // =================================================================
  console.log("--- PHASE 1: HIGH-VOLUME PUBLISHING THROUGHPUT ---");
  const volumes = [1000, 10000, 50000];

  for (const count of volumes) {
    attemptGC();
    const bus = new InMemoryEventBus();
    let receivedCount = 0;

    // Register a subscriber to ensure execution overhead is counted
    bus.subscribe("ToolExecuted", () => {
      receivedCount++;
    });

    const startMem = process.memoryUsage().heapUsed;
    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
      bus.publish({
        taskId: `task_${i}`,
        type: "ToolExecuted",
        payload: { sequence: i, timestamp: Date.now() }
      });
    }

    const duration = Date.now() - startTime;
    const endMem = process.memoryUsage().heapUsed;
    const memIncrease = Math.max(0, endMem - startMem);
    const throughput = (count / (duration / 1000)).toFixed(0);

    console.log(`[THROUGHPUT] Vol: ${count.toString().padEnd(6)} | Duration: ${duration.toString().padStart(4)} ms | Heap Growth: ${toMB(memIncrease).padStart(8)} | Rate: ${throughput.padStart(7)} ev/sec`);

    results.throughput.push({
      volume: count,
      durationMs: duration,
      heapGrowthBytes: memIncrease,
      eventsPerSec: parseFloat(throughput)
    });
  }

  // =================================================================
  // 2. WILDCARD VS DIRECT CHANNEL LATENCY COMPARISON
  // =================================================================
  console.log("\n--- PHASE 2: DIRECT VS WILDCARD CHANNEL ROUTING OVERHEAD ---");
  const directBus = new InMemoryEventBus();
  const wildcardBus = new InMemoryEventBus();
  const testCount = 10000;

  let directCounter = 0;
  let wildcardCounter = 0;

  // Set up 50 direct listeners
  for (let i = 0; i < 50; i++) {
    directBus.subscribe("ToolExecuted", () => {
      directCounter++;
    });
  }

  // Set up 50 wildcard listeners
  for (let i = 0; i < 50; i++) {
    wildcardBus.subscribe("*", () => {
      wildcardCounter++;
    });
  }

  const startDirect = Date.now();
  for (let i = 0; i < testCount; i++) {
    directBus.publish({ taskId: "t1", type: "ToolExecuted", payload: {} });
  }
  const durationDirect = Date.now() - startDirect;

  const startWildcard = Date.now();
  for (let i = 0; i < testCount; i++) {
    wildcardBus.publish({ taskId: "t1", type: "ToolExecuted", payload: {} });
  }
  const durationWildcard = Date.now() - startWildcard;

  console.log(`[ROUTING] Direct Channel   (50 listeners x 10k events) | Time: ${durationDirect.toString().padStart(4)} ms | Total Triggers: ${directCounter}`);
  console.log(`[ROUTING] Wildcard Channel (50 listeners x 10k events) | Time: ${durationWildcard.toString().padStart(4)} ms | Total Triggers: ${wildcardCounter}`);

  results.subscriberOverhead = {
    testCount,
    durationDirectMs: durationDirect,
    durationWildcardMs: durationWildcard,
    overheadMultiplier: (durationWildcard / Math.max(1, durationDirect)).toFixed(2)
  };

  // =================================================================
  // 3. SUBSCRIPTION LIFECYCLE MEMORY RECLAMATION (LEAK AUDIT)
  // =================================================================
  console.log("\n--- PHASE 3: SUBSCRIPTION LIFECYCLE MEMORY RECLAMATION ---");
  const leakBus = new InMemoryEventBus();
  attemptGC();
  const memBaseline = process.memoryUsage().heapUsed;

  console.log("[MEM-AUDIT] Registering 15,000 temporary subscribers...");
  const unsubscribes: (() => void)[] = [];
  for (let i = 0; i < 15000; i++) {
    const unsub = leakBus.subscribe("ToolExecuted", (ev) => {
      // Dummy closure tracking some block scope context to verify heap release
      const contextualIdx = i;
      const shadowPayload = ev.payload;
    });
    unsubscribes.push(unsub);
  }

  attemptGC();
  const memWithSubscribers = process.memoryUsage().heapUsed;
  console.log(`[MEM-AUDIT] Heap size with 15,000 active subscriptions: ${toMB(memWithSubscribers)}`);

  console.log("[MEM-AUDIT] Executing complete unsubscribe cleanup sequence...");
  for (const unsub of unsubscribes) {
    unsub();
  }
  // Clear reference array
  unsubscribes.length = 0;

  attemptGC();
  // Brief tick for engine collection
  await new Promise(resolve => setTimeout(resolve, 50));
  attemptGC();

  const memPostCleanup = process.memoryUsage().heapUsed;
  console.log(`[MEM-AUDIT] Heap size after unsubscribe & GC sweep: ${toMB(memPostCleanup)}`);
  console.log(`[MEM-AUDIT] Net retained subscription heap overhead: ${toMB(Math.max(0, memPostCleanup - memBaseline))}`);

  results.leakAudit = {
    baselineBytes: memBaseline,
    peakBytes: memWithSubscribers,
    cleanupBytes: memPostCleanup,
    retainedBytes: Math.max(0, memPostCleanup - memBaseline)
  };

  // =================================================================
  // 4. HISTORICAL EVENT JOURNAL REPLAY SPEED WITH FILTERS
  // =================================================================
  console.log("\n--- PHASE 4: JOURNAL FILTRATION REPLAY PERFORMANCE ---");
  const replayBus = new InMemoryEventBus();

  // Load 30,000 mixed events into the journal
  console.log("[REPLAY] Seeding Event Journal with 30,000 historical frames...");
  for (let i = 0; i < 30000; i++) {
    const targetTaskId = i % 3 === 0 ? "task_target_scope" : `task_other_${i % 10}`;
    const targetType = i % 5 === 0 ? "CheckpointCreated" : "ToolExecuted";

    replayBus.publish({
      taskId: targetTaskId,
      type: targetType,
      payload: { iteration: i }
    });
  }

  // Measure replay with compound filters
  let filteredReplayCount = 0;
  const startReplay = Date.now();
  
  replayBus.replay((ev) => {
    filteredReplayCount++;
  }, {
    taskId: "task_target_scope",
    type: "CheckpointCreated"
  });

  const durationReplay = Date.now() - startReplay;
  console.log(`[REPLAY] Audited 30,000 log entries.`);
  console.log(`[REPLAY] Replayed ${filteredReplayCount} matching items in: ${durationReplay} ms`);
  console.log(`[REPLAY] Replay processing throughput: ${(30000 / (durationReplay / 1000)).toFixed(0)} records/sec`);

  results.replayPerformance = {
    totalRecords: 30000,
    matchedRecords: filteredReplayCount,
    durationMs: durationReplay,
    recordsPerSec: durationReplay > 0 ? (30000 / (durationReplay / 1000)) : 30000000
  };

  console.log("\n=================================================================");
  console.log("               EVENT BUS VALIDATION RUN COMPLETE                 ");
  console.log("=================================================================\n");

  return results;
}

runEventBusValidation().catch(err => {
  console.error("Fatal Event Bus validation crash:", err);
  process.exit(1);
});
