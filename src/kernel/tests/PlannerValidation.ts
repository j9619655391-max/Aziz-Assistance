/**
 * @file /src/kernel/tests/PlannerValidation.ts
 * @description Benchmark suite for measuring formulation latency, throughput, and memory footprint of the Planner.
 */

import { Planner } from "../Planner";
import { InMemoryToolRegistry } from "../ToolRegistry";
import { InMemoryEventBus } from "../EventBus";
import { InMemoryStateStore } from "../StateStore";
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

async function runPlannerBenchmarks() {
  console.log("=================================================================");
  console.log("                  AZIZ KERNEL PLANNER BENCHMARKS                 ");
  console.log("=================================================================\n");

  const iterations = 10000;
  const stateStore = new InMemoryStateStore();
  const eventBus = new InMemoryEventBus();
  const toolRegistry = new InMemoryToolRegistry({
    eventBus,
    stateStore,
    grantedPermissions: ["math_allowed", "sys_audit"]
  });

  // Register some tools
  const toolMath: ToolManifest = {
    id: "calculator",
    name: "Calculator",
    description: "Evaluates expressions",
    permissions: ["math_allowed"],
    riskLevel: "low",
    timeoutMs: 50,
    maxRetries: 0,
    inputSchema: { type: "object" },
    outputSchema: { type: "object" }
  };
  toolRegistry.registerTool(toolMath, async () => ({}));

  const planner = new Planner(toolRegistry, eventBus);
  const context = {
    files: ["src/index.ts", "package.json"],
    symbolsGraph: {
      "src/index.ts": ["package.json"],
      "package.json": []
    }
  };

  attemptGC();
  const initialHeap = process.memoryUsage().heapUsed;
  const startOverall = Date.now();

  console.log(`[BENCHMARK] Formulating ${iterations} sequential task plans...`);

  for (let i = 0; i < iterations; i++) {
    const taskId = `task_bench_${i}`;
    const goal = "Perform math validation of 15 + 27";
    await planner.createPlan(taskId, goal, context);
  }

  const durationMs = Date.now() - startOverall;
  attemptGC();
  const finalHeap = process.memoryUsage().heapUsed;
  const heapDelta = Math.max(0, finalHeap - initialHeap);
  const avgLatencyUs = ((durationMs * 1000) / iterations).toFixed(3);
  const throughput = (iterations / (durationMs / 1000)).toFixed(0);

  console.log("\n------------------------- BENCHMARK RESULTS ---------------------");
  console.log(`Total Plan Formulations: ${iterations}`);
  console.log(`Total Execution Time   : ${durationMs} ms`);
  console.log(`Average Latency        : ${avgLatencyUs} µs per plan`);
  console.log(`Throughput             : ${throughput} plans formulated/sec`);
  console.log(`Initial Heap Memory    : ${toMB(initialHeap)}`);
  console.log(`Final Heap Memory      : ${toMB(finalHeap)}`);
  console.log(`Memory Overhead Delta  : ${toMB(heapDelta)} (${(heapDelta / iterations).toFixed(0)} bytes per plan)`);
  console.log("=================================================================\n");

  process.exit(0);
}

runPlannerBenchmarks().catch((err) => {
  console.error("Fatal benchmark runner crash:", err);
  process.exit(1);
});
