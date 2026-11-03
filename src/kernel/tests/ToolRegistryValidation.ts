/**
 * @file /src/kernel/tests/ToolRegistryValidation.ts
 * @description Thorough validation benchmarks and latency profiles for the Tool Registry.
 * Audits registration capacities, schema checking latency, permission evaluations, and concurrent stress runs.
 */

import { InMemoryToolRegistry } from "../ToolRegistry";
import { ToolManifest } from "../types";

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

async function runToolRegistryValidation() {
  console.log("=================================================================");
  console.log("             AZIZ KERNEL SPRINT 3 VALIDATION GATE               ");
  console.log("=================================================================\n");

  const results: any = {
    registration: {},
    schemaValidation: {},
    permissionOverhead: {},
    concurrentStress: {},
    memoryFootprint: {}
  };

  const sampleSchema = {
    type: "object",
    required: ["userId", "action", "params"],
    properties: {
      userId: { type: "integer" },
      action: { type: "string", enum: ["read", "write", "purge"] },
      params: {
        type: "object",
        required: ["path"],
        properties: {
          path: { type: "string" },
          flags: { type: "array", items: { type: "string" } }
        }
      }
    }
  };

  const baseManifest: ToolManifest = {
    id: "fs.write",
    name: "Write File",
    description: "Persists content safely on disk structure",
    permissions: ["fs.write"],
    riskLevel: "medium",
    timeoutMs: 100,
    maxRetries: 1,
    inputSchema: sampleSchema,
    outputSchema: { type: "boolean" }
  };

  // =================================================================
  // 1. REGISTRATION CAPACITY AND SPEED BENCHMARK
  // =================================================================
  console.log("--- PHASE 1: BULK REGISTRATION THROUGHPUT ---");
  const regCount = 10000;
  const regStore = new InMemoryToolRegistry();

  attemptGC();
  const startMem = process.memoryUsage().heapUsed;
  const startReg = Date.now();

  for (let i = 0; i < regCount; i++) {
    regStore.registerTool(
      {
        ...baseManifest,
        id: `tool_id_${i}`,
        name: `Tool Name Placeholder ${i}`
      },
      async () => true
    );
  }

  const durationReg = Date.now() - startReg;
  attemptGC();
  const endMem = process.memoryUsage().heapUsed;
  const memIncrease = Math.max(0, endMem - startMem);
  const regRate = (regCount / (durationReg / 1000)).toFixed(0);

  console.log(`[REGISTRATION] Registered: ${regCount} tools`);
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
  // 2. SCHEMA VALIDATION LATENCY PROFILING
  // =================================================================
  console.log("\n--- PHASE 2: JSON SCHEMA VALIDATION LATENCY ---");
  const validationCount = 50000;
  
  const validArgs = {
    userId: 1004,
    action: "write",
    params: {
      path: "/var/log/syslog",
      flags: ["compressed", "append-only"]
    }
  };

  const startVal = Date.now();
  for (let i = 0; i < validationCount; i++) {
    InMemoryToolRegistry.validateSchema(validArgs, sampleSchema);
  }
  const durationVal = Date.now() - startVal;
  const latencyPerCheckUs = ((durationVal * 1000) / validationCount).toFixed(3);

  console.log(`[SCHEMA-VAL] Evaluated : ${validationCount} schema matches`);
  console.log(`[SCHEMA-VAL] Total Time: ${durationVal} ms`);
  console.log(`[SCHEMA-VAL] Latency   : ${latencyPerCheckUs} µs per validation check`);

  results.schemaValidation = {
    count: validationCount,
    durationMs: durationVal,
    avgLatencyUs: parseFloat(latencyPerCheckUs)
  };

  // =================================================================
  // 3. PERMISSION SYSTEM POLICIES OVERHEAD
  // =================================================================
  console.log("\n--- PHASE 3: PERMISSION AUDITING OVERHEAD ---");
  const authCount = 20000;
  
  // Permission registry with static granted list and dynamic check
  const authRegistry = new InMemoryToolRegistry({
    grantedPermissions: ["fs.write", "fs.read", "network.fetch"],
    permissionChecker: (permissions, toolId) => {
      // Dynamic validation callback simulating database/cache lookup overhead
      return permissions.length > 0;
    }
  });

  authRegistry.registerTool(baseManifest, async () => true);

  const startAuth = Date.now();
  for (let i = 0; i < authCount; i++) {
    // Run tool execution (which performs static and dynamic auth inside)
    await authRegistry.executeTool("fs.write", validArgs, "auth_task");
  }
  const durationAuth = Date.now() - startAuth;
  const avgExecUs = ((durationAuth * 1000) / authCount).toFixed(3);

  console.log(`[PERMISSION] Executions: ${authCount} authenticated invocations`);
  console.log(`[PERMISSION] Total Time: ${durationAuth} ms`);
  console.log(`[PERMISSION] Latency   : ${avgExecUs} µs per full execution (Auth + Validation + Execution)`);

  results.permissionOverhead = {
    count: authCount,
    durationMs: durationAuth,
    avgLatencyUs: parseFloat(avgExecUs)
  };

  // =================================================================
  // 4. CONCURRENT STRESS EXECUTION
  // =================================================================
  console.log("\n--- PHASE 4: HIGH-CONCURRENCY PIPELINE STRESS RUN ---");
  const concurrentClients = 1000;
  const stressRegistry = new InMemoryToolRegistry();

  stressRegistry.registerTool(
    {
      ...baseManifest,
      id: "stress.worker",
      timeoutMs: 200,
      maxRetries: 0
    },
    async (args) => {
      // Small randomized execution latency Simulation
      await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5) + 1));
      return true;
    }
  );

  const startStress = Date.now();
  const tasks: Promise<any>[] = [];

  for (let i = 0; i < concurrentClients; i++) {
    tasks.push(stressRegistry.executeTool("stress.worker", validArgs, `stress_task_${i}`));
  }

  // Interleave and run 1,000 parallel jobs
  const outputs = await Promise.all(tasks);
  const durationStress = Date.now() - startStress;

  console.log(`[CONCURRENCY] Concurrent Requests: ${concurrentClients} parallel executions`);
  console.log(`[CONCURRENCY] Total Elapsed Time : ${durationStress} ms`);
  console.log(`[CONCURRENCY] Completed Outputs  : ${outputs.length}`);
  console.log(`[CONCURRENCY] Mean Throughput    : ${(concurrentClients / (durationStress / 1000)).toFixed(0)} transactions/sec`);

  results.concurrentStress = {
    clients: concurrentClients,
    durationMs: durationStress,
    throughput: parseFloat((concurrentClients / (durationStress / 1000)).toFixed(0))
  };

  // =================================================================
  // 5. REGISTRY MEMORY FOOTPRINT AUDIT
  // =================================================================
  console.log("\n--- PHASE 5: REGISTRY MEMORY FOOTPRINT ---");
  attemptGC();
  const heapBefore = process.memoryUsage().heapUsed;

  const footprintRegistry = new InMemoryToolRegistry();
  const bulkCount = 5000;

  for (let i = 0; i < bulkCount; i++) {
    footprintRegistry.registerTool(
      {
        ...baseManifest,
        id: `f_tool_${i}`,
        name: `F Tool Name ${i}`,
        description: `Visual footprint log summary descriptor sequence item index: ${i}`
      },
      async () => i
    );
  }

  attemptGC();
  const heapAfter = process.memoryUsage().heapUsed;
  const heapGrowth = Math.max(0, heapAfter - heapBefore);
  const avgKbPerTool = (heapGrowth / bulkCount / 1024).toFixed(3);

  console.log(`[PROFILE] Initial Heap Used: ${toMB(heapBefore)}`);
  console.log(`[PROFILE] Final Heap Used  : ${toMB(heapAfter)}`);
  console.log(`[PROFILE] Heap Growth Delta: ${toMB(heapGrowth)}`);
  console.log(`[PROFILE] Average footprint per loaded ToolManifest: ${avgKbPerTool} KB`);

  results.memoryFootprint = {
    totalTools: bulkCount,
    heapGrowthBytes: heapGrowth,
    avgKbPerTool: parseFloat(avgKbPerTool)
  };

  console.log("\n=================================================================");
  console.log("               TOOL REGISTRY VALIDATION RUN COMPLETE             ");
  console.log("=================================================================\n");

  return results;
}

runToolRegistryValidation().catch(err => {
  console.error("Fatal validation profiling run crashed:", err);
  process.exit(1);
});
