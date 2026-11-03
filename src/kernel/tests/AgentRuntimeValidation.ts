/**
 * @file /src/kernel/tests/AgentRuntimeValidation.ts
 * @description Thorough validation benchmarks and latency profiles for the Agent Runtime.
 * Audits registration throughput, execution context overhead, high-concurrency stress, and memory footprints.
 */

import { AgentRuntime, AgentManifest } from "../AgentRuntime";
import { InMemoryStateStore } from "../StateStore";
import { InMemoryEventBus } from "../EventBus";

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

async function runAgentRuntimeValidation() {
  console.log("=================================================================");
  console.log("             AZIZ KERNEL SPRINT 4 VALIDATION GATE               ");
  console.log("=================================================================\n");

  const results: any = {
    registration: {},
    contextOverhead: {},
    concurrentStress: {},
    memoryFootprint: {}
  };

  const sampleManifest: AgentManifest = {
    id: "fs_agent",
    name: "File Agent",
    description: "Performs general filesystem actions",
    capabilityTags: ["filesystem", "remediation"],
    maxExecutionTimeMs: 150
  };

  const store = new InMemoryStateStore();
  const bus = new InMemoryEventBus();

  // =================================================================
  // 1. REGISTRATION THROUGHPUT BENCHMARK
  // =================================================================
  console.log("--- PHASE 1: BULK REGISTRATION THROUGHPUT ---");
  const regCount = 10000;
  const regRuntime = new AgentRuntime(store, bus);

  attemptGC();
  const startMem = process.memoryUsage().heapUsed;
  const startReg = Date.now();

  for (let i = 0; i < regCount; i++) {
    regRuntime.registerAgent(
      {
        ...sampleManifest,
        id: `agent_id_${i}`,
        name: `Agent Name Placeholder ${i}`
      },
      async () => true
    );
  }

  const durationReg = Date.now() - startReg;
  attemptGC();
  const endMem = process.memoryUsage().heapUsed;
  const memIncrease = Math.max(0, endMem - startMem);
  const regRate = (regCount / (durationReg / 1000)).toFixed(0);

  console.log(`[REGISTRATION] Registered: ${regCount} agents`);
  console.log(`[REGISTRATION] Duration  : ${durationReg} ms`);
  console.log(`[REGISTRATION] Heap Delta: ${toMB(memIncrease)}`);
  console.log(`[REGISTRATION] Rate      : ${regRate} registrations/sec`);

  results.registration = {
    count: regCount,
    durationMs: durationReg,
    heapGrowthBytes: memIncrease,
    rate: parseFloat(regRate)
  };

  // =================================================================
  // 2. EXECUTION CONTEXT OVERHEAD PROFILING
  // =================================================================
  console.log("\n--- PHASE 2: EXECUTION CONTEXT LIFECYCLE OVERHEAD ---");
  const execCount = 10000;
  const testRuntime = new AgentRuntime(store, bus);

  testRuntime.registerAgent(sampleManifest, async (ctx) => {
    ctx.recordTelemetry(10, 0.0002);
    return true;
  });

  const taskIds: string[] = [];
  for (let i = 0; i < execCount; i++) {
    taskIds.push(store.createTask(`Execution task item reference ${i}`));
  }

  const startExec = Date.now();
  for (let i = 0; i < execCount; i++) {
    await testRuntime.executeTask(taskIds[i], "fs_agent");
  }
  const durationExec = Date.now() - startExec;
  const avgExecUs = ((durationExec * 1000) / execCount).toFixed(3);

  console.log(`[LIFECYCLE] Executions: ${execCount} sequential task runs`);
  console.log(`[LIFECYCLE] Total Time: ${durationExec} ms`);
  console.log(`[LIFECYCLE] Latency   : ${avgExecUs} µs per full execution lifecycle`);

  results.contextOverhead = {
    count: execCount,
    durationMs: durationExec,
    avgLatencyUs: parseFloat(avgExecUs)
  };

  // =================================================================
  // 3. HIGH-CONCURRENCY STRESS PIPELINE
  // =================================================================
  console.log("\n--- PHASE 3: HIGH-CONCURRENCY PIPELINE STRESS RUN ---");
  const concurrentClients = 1000;
  const stressRuntime = new AgentRuntime(store, bus);

  stressRuntime.registerAgent(
    {
      ...sampleManifest,
      id: "stress_worker_agent",
      maxExecutionTimeMs: 1000
    },
    async (ctx) => {
      // Simulate light async work latency (1-5ms)
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5) + 1));
      ctx.recordTelemetry(25, 0.0005);
      return { success: true };
    }
  );

  const stressTaskIds: string[] = [];
  for (let i = 0; i < concurrentClients; i++) {
    stressTaskIds.push(store.createTask(`Stress concurrent task item ${i}`));
  }

  const startStress = Date.now();
  const tasks: Promise<boolean>[] = [];

  for (let i = 0; i < concurrentClients; i++) {
    tasks.push(stressRuntime.executeTask(stressTaskIds[i], "stress_worker_agent"));
  }

  const outputs = await Promise.all(tasks);
  const durationStress = Date.now() - startStress;
  const completedCount = outputs.filter(Boolean).length;
  const meanThroughput = (concurrentClients / (durationStress / 1000)).toFixed(0);

  console.log(`[CONCURRENCY] Concurrent Requests: ${concurrentClients} parallel executions`);
  console.log(`[CONCURRENCY] Total Elapsed Time : ${durationStress} ms`);
  console.log(`[CONCURRENCY] Completed Outputs  : ${completedCount}`);
  console.log(`[CONCURRENCY] Mean Throughput    : ${meanThroughput} transactions/sec`);

  results.concurrentStress = {
    clients: concurrentClients,
    durationMs: durationStress,
    throughput: parseFloat(meanThroughput)
  };

  // =================================================================
  // 4. MEMORY FOOTPRINT AUDIT
  // =================================================================
  console.log("\n--- PHASE 4: AGENT REGISTRY MEMORY FOOTPRINT ---");
  attemptGC();
  const heapBefore = process.memoryUsage().heapUsed;

  const footprintRuntime = new AgentRuntime(store, bus);
  const bulkCount = 5000;

  for (let i = 0; i < bulkCount; i++) {
    footprintRuntime.registerAgent(
      {
        ...sampleManifest,
        id: `f_agent_${i}`,
        name: `F Agent Name ${i}`,
        description: `Visual footprint agent summary text descriptor string: ${i}`
      },
      async () => i
    );
  }

  attemptGC();
  const heapAfter = process.memoryUsage().heapUsed;
  const heapGrowth = Math.max(0, heapAfter - heapBefore);
  const avgKbPerAgent = (heapGrowth / bulkCount / 1024).toFixed(3);

  console.log(`[PROFILE] Initial Heap Used: ${toMB(heapBefore)}`);
  console.log(`[PROFILE] Final Heap Used  : ${toMB(heapAfter)}`);
  console.log(`[PROFILE] Heap Growth Delta: ${toMB(heapGrowth)}`);
  console.log(`[PROFILE] Average footprint per loaded AgentManifest: ${avgKbPerAgent} KB`);

  results.memoryFootprint = {
    totalAgents: bulkCount,
    heapGrowthBytes: heapGrowth,
    avgKbPerAgent: parseFloat(avgKbPerAgent)
  };

  console.log("\n=================================================================");
  console.log("               AGENT RUNTIME VALIDATION RUN COMPLETE             ");
  console.log("=================================================================\n");

  return results;
}

runAgentRuntimeValidation().catch(err => {
  console.error("Fatal validation profiling run crashed:", err);
  process.exit(1);
});
